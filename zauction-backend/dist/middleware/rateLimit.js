"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimit = rateLimit;
function rateLimit(options) {
    const { windowMs, max, message = 'Too many requests. Please try again later.', keyGenerator = (req) => req.ip || 'unknown' } = options;
    const buckets = new Map();
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
    return (req, res, next) => {
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
//# sourceMappingURL=rateLimit.js.map