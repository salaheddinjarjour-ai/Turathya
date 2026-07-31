import { Response } from 'express';
/**
 * Images are stored in the database as base64 `data:` URIs. Embedding those in
 * list responses is ruinous: /api/lots was returning 5.75 MB for 19 lots, of
 * which 99.6% was image bytes — and the parent auction's image was repeated on
 * every single row. Browsers then blocked on a 20–30s download before rendering
 * anything, which reads to users as the site being down.
 *
 * Instead, list endpoints return a URL pointing at an image route. The browser
 * fetches those in parallel, caches them for 24h, and can lazy-load them.
 * `<img src>` accepts a URL and a data: URI identically, so this is transparent
 * to every existing consumer.
 */
/** Replace a stored base64 image with a URL; pass external URLs through unchanged. */
export declare function toImageRef(stored: string | null | undefined, url: string): string | null;
/**
 * Serve a stored image as a real HTTP image response, decoding base64 when
 * needed and redirecting when the value is an external URL (e.g. Cloudinary).
 */
export declare function sendStoredImage(res: Response, stored: string | null | undefined, fallback?: string): void | Response<any, Record<string, any>>;
//# sourceMappingURL=imageResponse.d.ts.map