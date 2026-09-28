import type { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

// Disable rate limiting in development or when explicitly disabled
const isRateLimitDisabled =
    process.env.NODE_ENV !== 'production' ||
    process.env.DISABLE_RATE_LIMIT === 'true' ||
    process.env.ENABLE_RATE_LIMIT !== 'true';

const bypassMiddleware = (req: Request, res: Response, next: NextFunction) => next();

/** General traffic budget */
export const globalLimiter = isRateLimitDisabled
    ? bypassMiddleware
    : rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: Number(process.env.GLOBAL_RATE_LIMIT_MAX) || 5000,
        standardHeaders: true,
        legacyHeaders: false,
        validate: false,
        message: { message: 'Too many requests, please try again later.' },
        statusCode: 429,
    });

/** Auth traffic budget */
export const authLimiter = isRateLimitDisabled
    ? bypassMiddleware
    : rateLimit({
        windowMs: 15 * 60 * 1000,
        max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 1000,
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: true,
        validate: false,
        message: { message: 'Too many attempts, please try again later.' },
        statusCode: 429,
    });
