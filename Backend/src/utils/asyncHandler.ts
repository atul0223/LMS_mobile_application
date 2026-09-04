import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Wraps an async controller so a rejected promise reaches the global error
 * handler instead of hanging the request or surfacing an unhandled rejection.
 */
const asyncHandler = (
    handler: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler => {
    return (req, res, next) => {
        Promise.resolve(handler(req, res, next)).catch(next);
    };
};

export default asyncHandler;
