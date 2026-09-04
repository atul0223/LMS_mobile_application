import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import ApiError from "../utils/apiError.ts";

/**
 * Terminal error handler. Only ApiError messages are trusted for client
 * display; everything else is logged server-side and reported generically so
 * stack traces and driver internals never reach the caller.
 */
const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Express identifies error handlers by arity
    next: NextFunction
) => {
    if (res.headersSent) {
        return next(err);
    }

    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            message: err.message,
            ...(err.details ? { details: err.details } : {})
        });
    }

    if (err instanceof multer.MulterError) {
        const message =
            err.code === "LIMIT_FILE_SIZE"
                ? "File is too large."
                : "File upload rejected.";
        return res.status(400).json({ message });
    }

    // Duplicate key from a unique index — the offending field is safe to name,
    // but not its value.
    if (err?.code === 11000) {
        return res.status(409).json({ message: "Resource already exists." });
    }

    if (err?.name === "ValidationError") {
        return res.status(400).json({ message: "Invalid request payload." });
    }

    if (err?.name === "CastError") {
        return res.status(400).json({ message: "Malformed identifier." });
    }

    console.error(`Unhandled error on ${req.method} ${req.originalUrl}:`, err);
    return res.status(500).json({ message: "Something went wrong." });
};

export default errorHandler;
