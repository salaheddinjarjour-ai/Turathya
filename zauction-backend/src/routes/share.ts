import { Router, Request, Response } from 'express';
import { pool } from '../config/database';

const router = Router();

// ══════════════════════════════════════════════════════════════════
//  /share/lot/:id          — direct shareable link
//  /share/lot-by-id?id=x  — nginx bot-interception proxy
//
//  Both return server-side Open Graph HTML so crawlers (WhatsApp,
//  Facebook, Google) see proper title / description / image previews.
//  Human browsers receive an instant JS redirect to the real lot page.
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

async function serveOgPage(id: string, req: Request, res: Response): Promise<void> {
    const fallbackUrl = `${SITE_URL}/pages/lot.html?id=${encodeURIComponent(id)}`;

    try {
        if (!id) {
            res.redirect(SITE_URL);
            return;
        }

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
                     (SELECT url FROM lot_media
                      WHERE lot_id = l.id AND media_type = 'image'
                      ORDER BY display_order LIMIT 1),
                     l.image_data
                   ) as primary_image
            FROM lots l
            LEFT JOIN auctions a ON l.auction_id = a.id
            WHERE l.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            res.redirect(fallbackUrl);
            return;
        }

        const lot = result.rows[0];

        // Localized fields — prefer Arabic (primary site language)
        const title        = lot.title_ar || lot.title_en || lot.title || 'قطعة';
        const description  = (lot.description_ar || lot.description_en || lot.description || '').slice(0, 250);
        const category     = lot.category_ar || lot.category_en || lot.category || '';
        const lotTag       = lot.lot_number ? `LOT ${lot.lot_number}` : '';
        const auctionTitle = lot.auction_title || '';

        // Price text
        let priceText = '';
        if (lot.current_bid && parseFloat(lot.current_bid) > 0) {
            priceText = `المزايدة الحالية: $${parseFloat(lot.current_bid).toLocaleString()}`;
        } else if (lot.estimate_low && lot.estimate_high) {
            priceText = `التقدير: $${Number(lot.estimate_low).toLocaleString()} – $${Number(lot.estimate_high).toLocaleString()}`;
        }

        // OG image — always use the /api/lots/:id/og-image endpoint which:
        //   • decodes base64 data: URIs from DB and serves them as real HTTP images
        //   • redirects to external URLs (Cloudinary, etc.) directly
        // This gives WhatsApp/Facebook a real, crawlable image URL.
        const ogImage = `${SITE_URL}/api/lots/${encodeURIComponent(id)}/og-image`;

        // Meta description
        const metaDesc = [
            description,
            priceText,
            auctionTitle ? `المجموعة: ${auctionTitle}` : ''
        ].filter(Boolean).join(' • ').slice(0, 300);

        const ogTitle    = `${title}${lotTag ? ` — ${lotTag}` : ''} | ${SITE_NAME}`;
        const lotPageUrl = `${SITE_URL}/pages/lot.html?id=${encodeURIComponent(id)}`;

        // Detect social/search bots by User-Agent
        const ua    = req.headers['user-agent'] || '';
        const isBot = /facebookexternalhit|Twitterbot|WhatsApp|LinkedInBot|Slackbot|TelegramBot|Discordbot|Googlebot|bingbot|Applebot|bot|crawler|spider/i.test(ua);

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

    <!-- Open Graph (Facebook, WhatsApp, LinkedIn…) -->
    <meta property="og:type"         content="website">
    <meta property="og:site_name"    content="${escHtml(SITE_NAME)}">
    <meta property="og:url"          content="${escHtml(lotPageUrl)}">
    <meta property="og:title"        content="${escHtml(ogTitle)}">
    <meta property="og:description"  content="${escHtml(metaDesc)}">
    <meta property="og:image"        content="${escHtml(ogImage)}">
    <meta property="og:image:width"  content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt"    content="${escHtml(title)}">
    <meta property="og:locale"       content="ar_SA">

    <!-- Twitter Card -->
    <meta name="twitter:card"        content="summary_large_image">
    <meta name="twitter:title"       content="${escHtml(ogTitle)}">
    <meta name="twitter:description" content="${escHtml(metaDesc)}">
    <meta name="twitter:image"       content="${escHtml(ogImage)}">

    ${!isBot ? `<script>window.location.replace("${lotPageUrl}");</script>` : ''}
    ${!isBot ? `<meta http-equiv="refresh" content="0;url=${escHtml(lotPageUrl)}">` : ''}
</head>
<body style="background:#0e0c09;color:#f0ece4;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:2rem;text-align:center;box-sizing:border-box;">
    <div style="max-width:480px;">
        <h1 style="font-size:1.5rem;margin-bottom:.5rem;line-height:1.3;">${escHtml(title)}</h1>
        ${category ? `<p style="color:#c6a46c;margin:.3rem 0;font-size:.95rem;">${escHtml(category)}</p>` : ''}
        ${lotTag   ? `<p style="color:#888;font-size:.8rem;margin:.2rem 0;">${escHtml(lotTag)}</p>` : ''}
        ${metaDesc ? `<p style="color:#aaa;font-size:.9rem;margin-top:.8rem;line-height:1.6;">${escHtml(metaDesc)}</p>` : ''}
        <a href="${escHtml(lotPageUrl)}"
           style="display:inline-block;margin-top:1.5rem;padding:12px 32px;background:#c6a46c;color:#0e0c09;border-radius:8px;text-decoration:none;font-weight:700;font-size:1rem;">
            عرض التفاصيل
        </a>
    </div>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', isBot ? 'public, max-age=600' : 'no-cache');
        res.send(html);

    } catch (error) {
        console.error('Share OG error:', error);
        res.redirect(fallbackUrl);
    }
}

// ── Route 1: /share/lot/:id  (direct shareable links) ─────────────
router.get('/lot/:id', (req: Request, res: Response) => {
    serveOgPage(req.params.id, req, res);
});

// ── Route 2: /share/lot-by-id?id=  (nginx bot-interception proxy) ──
// nginx proxies bot requests from /pages/lot.html?id=xxx here,
// passing the id as a query param.
router.get('/lot-by-id', (req: Request, res: Response) => {
    const id = (req.query.id as string) || '';
    serveOgPage(id, req, res);
});

export default router;
