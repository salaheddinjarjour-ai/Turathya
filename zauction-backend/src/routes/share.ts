import { Router, Request, Response } from 'express';
import { pool } from '../config/database';

const router = Router();

// ══════════════════════════════════════════════════════════════════
//  GET /share/lot/:id
//
//  Returns an HTML page with server-side Open Graph meta tags.
//  Crawlers (WhatsApp, Facebook, Google) get proper previews.
//  Human browsers are immediately redirected to the real lot page.
// ══════════════════════════════════════════════════════════════════

const SITE_URL  = process.env.SITE_URL  || 'https://turathya.com';
const SITE_NAME = process.env.SITE_NAME || 'تراثيا — TURATHYA';

function escHtml(str: string): string {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

router.get('/lot/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Fetch lot from DB
        const result = await pool.query(`
            SELECT l.id, l.title, l.title_ar, l.title_en,
                   l.description, l.description_ar, l.description_en,
                   l.category, l.category_ar, l.category_en,
                   l.lot_number, l.start_date, l.end_date,
                   l.estimate_low, l.estimate_high, l.current_bid,
                   l.image_data,
                   a.title as auction_title,
                   COALESCE(
                     (SELECT url FROM lot_media WHERE lot_id = l.id AND media_type = 'image' ORDER BY display_order LIMIT 1),
                     l.image_data
                   ) as primary_image
            FROM lots l
            LEFT JOIN auctions a ON l.auction_id = a.id
            WHERE l.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.redirect(`${SITE_URL}/pages/lot.html?id=${encodeURIComponent(id)}`);
        }

        const lot = result.rows[0];

        // Resolve localized fields (prefer Arabic since site is Arabic)
        const title       = lot.title_ar || lot.title_en || lot.title || 'قطعة';
        const description = (lot.description_ar || lot.description_en || lot.description || '').slice(0, 200);
        const category    = lot.category_ar || lot.category_en || lot.category || '';
        const lotTag      = lot.lot_number ? `LOT ${lot.lot_number}` : '';
        const auctionTitle = lot.auction_title || '';

        // Price info
        let priceText = '';
        if (lot.current_bid && parseFloat(lot.current_bid) > 0) {
            priceText = `المزايدة الحالية: $${parseFloat(lot.current_bid).toLocaleString()}`;
        } else if (lot.estimate_low && lot.estimate_high) {
            priceText = `التقدير: $${Number(lot.estimate_low).toLocaleString()} – $${Number(lot.estimate_high).toLocaleString()}`;
        }

        // OG image — only use external URLs (skip data: URIs — too large)
        const primaryImage = lot.primary_image;
        const ogImage = primaryImage && !primaryImage.startsWith('data:')
            ? primaryImage
            : `${SITE_URL}/assets/images/favicon-192.png`;

        // Build meta description
        const metaDesc = [description, priceText, auctionTitle ? `المجموعة: ${auctionTitle}` : '']
            .filter(Boolean).join(' • ').slice(0, 300);

        const ogTitle = `${title}${lotTag ? ` — ${lotTag}` : ''} | ${SITE_NAME}`;
        const lotPageUrl = `${SITE_URL}/pages/lot.html?id=${encodeURIComponent(id)}`;

        // Detect bots — humans get immediate JS redirect, bots get the full meta page
        const ua = req.headers['user-agent'] || '';
        const isBot = /bot|crawler|spider|facebookexternalhit|Twitterbot|WhatsApp|LinkedInBot|Slackbot|TelegramBot|Discordbot|Googlebot|bingbot|Applebot/i.test(ua);

        const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <!-- Primary SEO -->
    <title>${escHtml(ogTitle)}</title>
    <meta name="description" content="${escHtml(metaDesc)}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${escHtml(lotPageUrl)}">

    <!-- Open Graph -->
    <meta property="og:type"        content="website">
    <meta property="og:site_name"   content="${escHtml(SITE_NAME)}">
    <meta property="og:url"         content="${escHtml(lotPageUrl)}">
    <meta property="og:title"       content="${escHtml(ogTitle)}">
    <meta property="og:description" content="${escHtml(metaDesc)}">
    <meta property="og:image"       content="${escHtml(ogImage)}">
    <meta property="og:image:width"  content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:locale"      content="ar_SA">

    <!-- Twitter Card -->
    <meta name="twitter:card"        content="summary_large_image">
    <meta name="twitter:title"       content="${escHtml(ogTitle)}">
    <meta name="twitter:description" content="${escHtml(metaDesc)}">
    <meta name="twitter:image"       content="${escHtml(ogImage)}">

    ${!isBot ? `<script>window.location.replace("${lotPageUrl}");</script>` : ''}
    ${!isBot ? `<meta http-equiv="refresh" content="0;url=${escHtml(lotPageUrl)}">` : ''}
</head>
<body style="background:#0e0c09;color:#f0ece4;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center;">
    <div>
        <h1 style="font-size:1.4rem;margin-bottom:.5rem;">${escHtml(title)}</h1>
        ${category ? `<p style="color:#c6a46c;margin:.3rem 0;">${escHtml(category)}</p>` : ''}
        ${metaDesc ? `<p style="color:#888;font-size:.9rem;max-width:420px;">${escHtml(metaDesc)}</p>` : ''}
        <a href="${escHtml(lotPageUrl)}"
           style="display:inline-block;margin-top:1.5rem;padding:12px 28px;background:#c6a46c;color:#0e0c09;border-radius:6px;text-decoration:none;font-weight:700;">
            عرض التفاصيل
        </a>
    </div>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        // Cache for 10 minutes (bots) or not at all (humans who get redirected)
        if (isBot) {
            res.setHeader('Cache-Control', 'public, max-age=600');
        } else {
            res.setHeader('Cache-Control', 'no-cache');
        }
        return res.send(html);

    } catch (error) {
        console.error('Share OG error:', error);
        return res.redirect(`${SITE_URL}/pages/lot.html?id=${encodeURIComponent(req.params.id)}`);
    }
});

export default router;
