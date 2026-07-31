import { Request, Response, NextFunction } from 'express';

/**
 * Minimal fixed-window rate limiter.
 *
 * Deliberately dependency-free: the app runs as a single process behind nginx,
 * which is exactly the case express-rate-limit's default memory store covers.
 * If this ever runs multi-instance, this needs to move to a shared store
 * (Redis) — per-process counters would let each instance grant a full quota.
 *
 * NOTE: this keys on req.ip, which is only the real client address when
 * `trust proxy` is set AND nginx forwards X-Forwarded-For.
 */

type Bucket = {
    count: number;
    resetAt: number;
};

type RateLimitOptions = {
    /** Window length in milliseconds. */
    windowMs: number;
    /** Requests allowed per window. */
    max: number;
    /** Message returned once the limit is hit. */
    message?: string;
    /** Derive the bucket key. Defaults to the client IP. */
    keyGenerator?: (req: Request) => string;
};

export function rateLimit(options: RateLimitOptions) {
    const {
        windowMs,
        max,
        message = 'Too many requests. Please try again later.',
        keyGenerator = (req: Request) => req.ip || 'unknown'
    } = options;

    const buckets = new Map<string, Bucket>();

    // Drop expired buckets so the map cannot grow without bound.
    const sweeper = setInterval(() => {
        const now = Date.now();
        for (const [key, bucket] of buckets) {
            if (now > bucket.resetAt) {
                buckets.delete(key);
            }
        }
    }, windowMs);
    sweeper.unref();

    return (req: Request, res: Response, next: NextFunction) => {
        const key = keyGenerator(req);
        const now = Date.now();
        const bucket = buckets.get(key);

        if (!bucket || now > bucket.resetAt) {
            buckets.set(key, { count: 1, resetAt: now + windowMs });
            return next();
        }

        bucket.count += 1;

        if (bucket.count > max) {
            const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
            res.setHeader('Retry-After', String(retryAfter));
            return res.status(429).json({ error: message, retry_after: retryAfter });
        }

        next();
    };
}
