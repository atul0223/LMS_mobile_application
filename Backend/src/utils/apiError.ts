/**
 * Error carrying an HTTP status the global handler is allowed to expose.
 * Anything thrown that is not an ApiError is treated as unexpected and
 * reported to the client as a generic 500.
 */
class ApiError extends Error {
    statusCode: number;
    details?: Record<string, unknown>;

    constructor(statusCode: number, message: string, details?: Record<string, unknown>) {
        super(message);
        this.name = "ApiError";
        this.statusCode = statusCode;
        this.details = details;
        Error.captureStackTrace?.(this, ApiError);
    }
}

export default ApiError;
