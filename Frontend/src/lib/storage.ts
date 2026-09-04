import * as SecureStore from "expo-secure-store";

/**
 * The only module in the app that touches persistent storage.
 *
 * Everything else goes through these three functions, so swapping the backing
 * store (for example adding a web fallback, since SecureStore is native-only)
 * is a change to this file alone.
 */

const TOKEN_KEY = "lms.accessToken";

export const getToken = async (): Promise<string | null> => {
    try {
        return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
        // A read failure is treated as "no session" rather than a crash — the
        // user can always sign in again.
        return null;
    }
};

export const setToken = async (token: string): Promise<void> => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
};

export const deleteToken = async (): Promise<void> => {
    try {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch {
        // Deleting a key that is already gone is not an error worth surfacing.
    }
};
