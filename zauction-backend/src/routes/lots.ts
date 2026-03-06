import { Router, Response } from 'express';
import { pool } from '../config/database';

const router = Router();

// Get all lots (public)
router.get('/', async (req, res) => {
    try {
        const { category, status, auction_id } = req.query;

        let query = `
            SELECT l.*, a.title as auction_title, a.end_date, a.image_data as auction_image,
                l.title_en, l.title_ar, l.description_en, l.description_ar,
                l.category_en, l.category_ar,
                (SELECT COUNT(*) FROM lot_media WHERE lot_id = l.id) as media_count,
                COALESCE(
                  (SELECT url FROM lot_media WHERE lot_id = l.id ORDER BY display_order LIMIT 1),
                  l.image_data
                ) as primary_image
            FROM lots l
            JOIN auctions a ON l.auction_id = a.id
            WHERE 1=1
        `;
        const params: any[] = [];

        if (category) {
            params.push(category);
            query += ` AND l.category = $${params.length}`;
        }

        if (status) {
            params.push(status);
            query += ` AND l.status = $${params.length}`;
        }

        if (auction_id) {
            params.push(auction_id);
            query += ` AND l.auction_id = $${params.length}`;
        }

        query += ' ORDER BY l.created_at DESC';

        const result = await pool.query(query, params);
        res.json({ lots: result.rows });
    } catch (error) {
        console.error('Get lots error:', error);
        res.status(500).json({ error: 'Failed to get lots' });
    }
});

// Get single lot (public)
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Get lot with auction info
        const lotResult = await pool.query(
            `SELECT l.*, a.title as auction_title, a.end_date, a.end_date as auction_end_date,
        a.status as auction_status, a.image_data as auction_image,
        a.title_en as auction_title_en, a.title_ar as auction_title_ar,
        l.title_en, l.title_ar, l.description_en, l.description_ar,
        l.category_en, l.category_ar, l.condition_en, l.condition_ar,
        l.provenance_en, l.provenance_ar,
        (SELECT COUNT(*) FROM bids WHERE lot_id = l.id) as bid_count,
        (SELECT MAX(amount) FROM bids WHERE lot_id = l.id) as current_bid
       FROM lots l
       JOIN auctions a ON l.auction_id = a.id
       WHERE l.id = $1`,
            [id]
        );

        if (lotResult.rows.length === 0) {
            return res.status(404).json({ error: 'Lot not found' });
        }

        const lot = lotResult.rows[0];

        // Get media
        const mediaResult = await pool.query(
            'SELECT * FROM lot_media WHERE lot_id = $1 ORDER BY display_order',
            [id]
        );

        lot.media = mediaResult.rows;

        res.json({ lot });
    } catch (error) {
        console.error('Get lot error:', error);
        res.status(500).json({ error: 'Failed to get lot' });
    }
});

// Get lot bid history (public)
router.get('/:id/bids', async (req, res) => {
    try {
        const { id } = req.params;
        const limit = parseInt(req.query.limit as string) || 10;

        const result = await pool.query(
            `SELECT b.id, b.amount, b.created_at, u.full_name as bidder_name
       FROM bids b
       JOIN users u ON b.user_id = u.id
       WHERE b.lot_id = $1
       ORDER BY b.created_at DESC
       LIMIT $2`,
            [id, limit]
        );

        res.json({ bids: result.rows });
    } catch (error) {
        console.error('Get lot bids error:', error);
        res.status(500).json({ error: 'Failed to get bids' });
    }
});

export default router;
