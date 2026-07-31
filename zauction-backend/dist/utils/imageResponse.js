"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toImageRef = toImageRef;
exports.sendStoredImage = sendStoredImage;
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
function toImageRef(stored, url) {
    if (!stored)
        return null;
    return stored.startsWith('data:') ? url : stored;
}
/**
 * Serve a stored image as a real HTTP image response, decoding base64 when
 * needed and redirecting when the value is an external URL (e.g. Cloudinary).
 */
function sendStoredImage(res, stored, fallback = '/assets/images/og-default.png') {
    if (!stored) {
        return res.redirect(fallback);
    }
    if (!stored.startsWith('data:')) {
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.redirect(stored);
    }
    const matches = stored.match(/^data:([^;]+);base64,(.+)$/s);
    if (!matches) {
        return res.redirect(fallback);
    }
    const buffer = Buffer.from(matches[2], 'base64');
    res.setHeader('Content-Type', matches[1]);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.send(buffer);
}
//# sourceMappingURL=imageResponse.js.map