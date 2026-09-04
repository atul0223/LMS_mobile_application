import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, ApiError, setUnauthorizedHandler } from "./api";
import { deleteToken, getToken, setToken } from "./storage";
import { SessionContext, type SessionValue } from "./session";
import type { User } from "@/types/api";

interface MeResponse {
    user: User;
}

/**
 * Owns authentication state for the whole app.
 *
 * The token is the source of truth and lives in secure storage; the user object
 * is fetched from the server so role and enrollment can never drift from what
 * the backend will actually authorize.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
    const [token, setTokenState] = useState<string | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Guards against a late-resolving request writing state after sign-out.
    const generation = useRef(0);

    const clearSession = useCallback(async () => {
        generation.current += 1;
        setTokenState(null);
        setUser(null);
        await deleteToken();
    }, []);

    // The API client calls this when the server rejects our token, so an
    // expired or revoked session is cleared exactly once, in one place.
    useEffect(() => {
        setUnauthorizedHandler(() => {
            void clearSession();
        });
        return () => setUnauthorizedHandler(null);
    }, [clearSession]);

    const loadUser = useCallback(async (): Promise<User | null> => {
        const current = generation.current;
        const me = await api.get<MeResponse>("/user/me");
        if (generation.current !== current) {
            // Signed out while the request was in flight; discard the result.
            return null;
        }
        setUser(me.user);
        return me.user;
    }, []);

    // Restore a persisted session on cold start.
    useEffect(() => {
        let active = true;

        (async () => {
            const stored = await getToken();
            if (!active) return;

            if (!stored) {
                setIsLoading(false);
                return;
            }

            setTokenState(stored);
            try {
                await loadUser();
            } catch (error) {
                // A rejected token is already cleared by the 401 handler. Any
                // other failure (server down, offline) should not destroy a
                // valid session — the user keeps the token and can retry.
                if (error instanceof ApiError && error.status === 401) {
                    await clearSession();
                }
            } finally {
                if (active) setIsLoading(false);
            }
        })();

        return () => {
            active = false;
        };
    }, [loadUser, clearSession]);

    const signIn = useCallback(
        async (nextToken: string) => {
            generation.current += 1;
            await setToken(nextToken);
            setTokenState(nextToken);
            try {
                await loadUser();
            } catch (error) {
                // Without a user we cannot route by role, so a failed load
                // leaves no usable session.
                await clearSession();
                throw error;
            }
        },
        [loadUser, clearSession]
    );

    const signOut = useCallback(async () => {
        await clearSession();
    }, [clearSession]);

    const refreshUser = useCallback(async () => {
        if (!generation.current && !token) return;
        try {
            await loadUser();
        } catch {
            // A refresh is best-effort; keep showing the last known user.
        }
    }, [loadUser, token]);

    const value = useMemo<SessionValue>(
        () => ({ token, user, isLoading, signIn, signOut, refreshUser }),
        [token, user, isLoading, signIn, signOut, refreshUser]
    );

    return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export default SessionProvider;
