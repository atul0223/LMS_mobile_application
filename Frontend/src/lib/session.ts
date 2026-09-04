import { createContext, useContext } from "react";
import type { User } from "@/types/api";

export interface SessionValue {
    /** Bearer token, or null when signed out. */
    token: string | null;
    /** The signed-in user, or null while loading or signed out. */
    user: User | null;
    /** True until the persisted token has been read and validated. */
    isLoading: boolean;
    /** Persists the token and loads the matching user. */
    signIn: (token: string) => Promise<void>;
    /** Clears the token and user. */
    signOut: () => Promise<void>;
    /** Re-reads the current user, e.g. after a purchase changes enrollment. */
    refreshUser: () => Promise<void>;
}

export const SessionContext = createContext<SessionValue | null>(null);

export const useSession = (): SessionValue => {
    const value = useContext(SessionContext);
    if (!value) {
        throw new Error("useSession must be used inside <SessionProvider>");
    }
    return value;
};
