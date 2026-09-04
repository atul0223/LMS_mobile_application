import rateLimit from 'express-rate-limit';

/** General traffic budget, applied to every route. */
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    message: { message: 'Too many requests, please try again later.' },
    statusCode: 429
});

/**
 * Credential endpoints get a much smaller budget than general traffic — the
 * global 100/15min is far too generous for password and OTP guessing.
 *
 * Applied per-route rather than to the whole /user mount so that authenticated
 * reads such as GET /user/me are not throttled by failed login attempts.
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    // Bursts of failures are the signal worth throttling; successful logins
    // should not consume the budget.
    skipSuccessfulRequests: true,
    message: { message: 'Too many attempts, please try again later.' },
    statusCode: 429
});
