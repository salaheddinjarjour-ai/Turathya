import { Router } from 'express';
import { pool } from '../config/database';

const router = Router();

// Get categories (public)
router.get('/', async (req, res) => {
    try {
        const { status, featured } = req.query;

        let query = `
      SELECT a.*,
        a.id as category_id,
        a.title as name,
        a.title_en as name_en,
        a.title_ar as name_ar,
        (SELECT COUNT(*) FROM lots WHERE auction_id = a.id) as product_count,
        (SELECT l.id FROM lots l WHERE l.auction_id = a.id LIMIT 1) as single_product_id,
        (SELECT COUNT(DISTINCT b.user_id)
         FROM bids b
         JOIN lots l ON b.lot_id = l.id
         WHERE l.auction_id = a.id) as unique_bidders
      FROM auctions a
      WHERE 1=1
    `;
        const params: any[] = [];

        if (status) {
            const statusValue = String(status);
            const statuses = statusValue
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean);

            if (statuses.length === 1) {
                params.push(statuses[0]);
                query += ` AND a.status = $${params.length}`;
            } else if (statuses.length > 1) {
                params.push(statuses);
                query += ` AND a.status = ANY($${params.length})`;
            }
        }

        if (featured === 'true') {
            query += ' ORDER BY unique_bidders DESC, a.created_at DESC LIMIT 12';
        } else {
            query += ' ORDER BY a.created_at DESC';
        }

        const result = await pool.query(query, params);
        res.json({ categories: result.rows });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Failed to get categories' });
    }
});

// Get single category (public)
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT a.*,
        a.id as category_id,
        a.title as name,
        a.title_en as name_en,
        a.title_ar as name_ar,
        (SELECT COUNT(*) FROM lots WHERE auction_id = a.id) as product_count,
        (SELECT l.id FROM lots l WHERE l.auction_id = a.id LIMIT 1) as single_product_id
       FROM auctions a
       WHERE a.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }

        res.json({ category: result.rows[0] });
    } catch (error) {
        console.error('Get category error:', error);
        res.status(500).json({ error: 'Failed to get category' });
    }
});

// Get products in category (public)
router.get('/:id/products', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT l.*, a.title as category_title, a.image_data as category_image,
        l.title_en, l.title_ar, l.description_en, l.description_ar,
        l.category_en, l.category_ar,
        l.auction_id as category_id,
        (SELECT COUNT(*) FROM lot_media WHERE lot_id = l.id) as media_count,
        COALESCE(
          (SELECT url FROM lot_media WHERE lot_id = l.id ORDER BY display_order LIMIT 1),
          l.image_data
        ) as primary_image
       FROM lots l
       JOIN auctions a ON l.auction_id = a.id
       WHERE l.auction_id = $1
       ORDER BY l.lot_number ASC`,
            [id]
        );

        res.json({ products: result.rows });
    } catch (error) {
        console.error('Get category products error:', error);
        res.status(500).json({ error: 'Failed to get products' });
    }
});

export default router;
