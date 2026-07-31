import { Router } from 'express';
import { pool } from '../config/database';
import { toImageRef } from '../utils/imageResponse';

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
        // Image URLs rather than inlined base64 — see utils/imageResponse.
        const categories = result.rows.map((category) => ({
            ...category,
            image_data: toImageRef(category.image_data, `/api/auctions/${category.id}/image`)
        }));

        res.json({ categories });
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

        const category = result.rows[0];
        category.image_data = toImageRef(category.image_data, `/api/auctions/${category.id}/image`);

        res.json({ category });
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
            // a.start_date / a.end_date MUST stay aliased: selected bare alongside
            // l.* they overwrite each lot's own dates on the result row, which made
            // every product here inherit the category's timing instead of its own.
            `SELECT l.*,
        a.title as category_title,
        a.start_date as category_start_date,
        a.end_date   as category_end_date,
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

        const products = result.rows.map((product) => ({
            ...product,
            primary_image: toImageRef(product.primary_image, `/api/lots/${product.id}/og-image`),
            image_data: toImageRef(product.image_data, `/api/lots/${product.id}/og-image`)
        }));

        res.json({ products });
    } catch (error) {
        console.error('Get category products error:', error);
        res.status(500).json({ error: 'Failed to get products' });
    }
});

export default router;
