import { getToken } from "./storage";

/**
 * The single HTTP entry point for the app.
 *
 * Screens call `api.get/post/put/del/upload` and branch on `ApiError.status`.
 * They never call `fetch`, never read the token, and never handle 401 — that is
 * handled here, once.
 */

const BASE_URL = (process.env.EXPO_PUBLIC_API_URL || "http://localhost:5002").replace(/\/+$/, "");

/**
 * Requests that outlive this are aborted so the UI cannot hang indefinitely.
 *
 * Set generously because free hosting tiers sleep idle instances: the first
 * request after a sleep has to wait out a cold start, which routinely takes
 * 30-60s. A tighter timeout would make the first login of every session fail.
 */
const TIMEOUT_MS = 60_000;
/** Uploads transcode server-side and legitimately take minutes. */
const UPLOAD_TIMEOUT_MS = 10 * 60_000;

export class ApiError extends Error {
    /** HTTP status, or 0 for a network failure or timeout. */
    status: number;
    body: any;

    constructor(status: number, message: string, body?: any) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.body = body;
    }

    /** True when the request never reached the server. */
    get isNetworkError() {
        return this.status === 0;
    }
}

/**
 * Called when the server rejects our token. Registered by the session provider
 * rather than imported, which would make session <-> api circular.
 */
let onUnauthorized: (() => void) | null = null;

export const setUnauthorizedHandler = (handler: (() => void) | null) => {
    onUnauthorized = handler;
};

type Query = Record<string, string | number | boolean | undefined | null>;

const buildUrl = (path: string, query?: Query): string => {
    const url = `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
    if (!query) return url;

    const params = Object.entries(query)
        .filter(([, value]) => value !== undefined && value !== null && value !== "")
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);

    return params.length > 0 ? `${url}?${params.join("&")}` : url;
};

interface RequestOptions {
    query?: Query;
    /** Skips bearer injection — used by login/signup/verifyOtp. */
    anonymous?: boolean;
    signal?: AbortSignal;
}

const request = async <T>(
    method: string,
    path: string,
    body?: unknown,
    options: RequestOptions = {},
    timeoutMs: number = TIMEOUT_MS
): Promise<T> => {
    const headers: Record<string, string> = { Accept: "application/json" };

    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    if (body !== undefined && !isFormData) {
        // Setting Content-Type on FormData would omit the multipart boundary.
        headers["Content-Type"] = "application/json";
    }

    if (!options.anonymous) {
        const token = await getToken();
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    // Honour a caller-supplied signal (screen unmount) alongside the timeout.
    const abortFromCaller = () => controller.abort();
    options.signal?.addEventListener("abort", abortFromCaller);

    let response: Response;
    try {
        response = await fetch(buildUrl(path, options.query), {
            method,
            headers,
            body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
            signal: controller.signal,
        });
    } catch (error: any) {
        const timedOut = error?.name === "AbortError";
        throw new ApiError(
            0,
            timedOut ? "The request timed out. Check your connection and try again." : "Unable to reach the server.",
            null
        );
    } finally {
        clearTimeout(timeout);
        options.signal?.removeEventListener("abort", abortFromCaller);
    }

    const raw = await response.text();
    let parsed: any = null;
    if (raw) {
        try {
            parsed = JSON.parse(raw);
        } catch {
            parsed = raw;
        }
    }

    if (!response.ok) {
        // A rejected token invalidates the session everywhere; handled centrally
        // so screens never duplicate (and double-fire) this redirect.
        if (response.status === 401 && !options.anonymous) {
            onUnauthorized?.();
        }
        const message =
            (parsed && typeof parsed === "object" && (parsed.message || parsed.error)) ||
            "Something went wrong.";
        throw new ApiError(response.status, String(message), parsed);
    }

    return parsed as T;
};

export const api = {
    get: <T>(path: string, options?: RequestOptions) => request<T>("GET", path, undefined, options),
    post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
        request<T>("POST", path, body, options),
    put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
        request<T>("PUT", path, body, options),
    del: <T>(path: string, body?: unknown, options?: RequestOptions) =>
        request<T>("DELETE", path, body, options),
    /** Multipart upload; allows a long timeout for server-side transcoding. */
    upload: <T>(path: string, form: FormData, options?: RequestOptions) =>
        request<T>("POST", path, form, options, UPLOAD_TIMEOUT_MS),
};

export default api;
