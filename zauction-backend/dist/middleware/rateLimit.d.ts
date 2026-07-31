import { Request, Response, NextFunction } from 'express';
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
export declare function rateLimit(options: RateLimitOptions): (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
export {};
//# sourceMappingURL=rateLimit.d.ts.map