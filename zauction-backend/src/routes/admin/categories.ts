import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import { pool } from '../../config/database';
import { authenticate, requireAdmin, AuthRequest } from '../../middleware/auth';
import { buildUpdateSet, AUCTION_UPDATABLE_COLUMNS } from '../../utils/buildUpdate';

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

router.use(authenticate, requireAdmin);

router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT a.*,
        a.id as category_id,
        a.title as name,
        a.title_en as name_en,
        a.title_ar as name_ar,
        (SELECT COUNT(*) FROM lots WHERE auction_id = a.id) as product_count
       FROM auctions a
       ORDER BY a.created_at DESC`
        );

        res.json({ categories: result.rows });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Failed to get categories' });
    }
});

router.post(
    '/',
    [
        body('title').optional().trim().notEmpty(),
        body('title_en').optional().trim().notEmpty(),
        body('title_ar').optional().trim().notEmpty(),
        body('buyers_premium').optional().isFloat({ min: 0, max: 100 })
    ],
    async (req: AuthRequest, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const {
                title,
                description,
                category,
                location,
                title_en,
                title_ar,
                description_en,
                description_ar,
                category_en,
                category_ar,
                location_en,
                location_ar,
                image_url,
                featured = false,
                status = 'active'
            } = req.body;

            const resolvedTitle = title || title_en || title_ar;
            if (!resolvedTitle) {
                return res.status(400).json({ error: 'Category title is required' });
            }

            // Keep legacy columns populated for backward compatibility with existing pages.
            const startDate = req.body.start_date || new Date().toISOString();
            const endDate = req.body.end_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

            const result = await pool.query(
                `INSERT INTO auctions (
          id, title, description, category, location,
          title_en, title_ar, description_en, description_ar,
          category_en, category_ar, location_en, location_ar,
          start_date, end_date,
          buyers_premium, image_url, featured, status, created_by, created_at, updated_at
        ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, COALESCE($15, 0), $16, $17, $18, $19, NOW(), NOW())
        RETURNING *, id as category_id`,
                [
                    resolvedTitle,
                    description || description_en || description_ar,
                    category || category_en || category_ar,
                    location || location_en || location_ar,
                    title_en,
                    title_ar,
                    description_en,
                    description_ar,
                    category_en,
                    category_ar,
                    location_en,
                    location_ar,
                    startDate,
                    endDate,
                    req.body.buyers_premium,
                    image_url,
                    featured,
                    status,
                    req.user!.id
                ]
            );

            res.status(201).json({
                message: 'Category created successfully',
                category: result.rows[0]
            });
        } catch (error) {
            console.error('Create category error:', error);
            res.status(500).json({ error: 'Failed to create category' });
        }
    }
);

router.patch('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Categories are rows in the auctions table, so they share its allowlist.
        const { fields, rejected, setClause, values } =
            buildUpdateSet(updates, AUCTION_UPDATABLE_COLUMNS);
        if (fields.length === 0) {
            return res.status(400).json({
                error: 'No updatable fields provided',
                ...(rejected.length ? { rejected_fields: rejected } : {})
            });
        }

        const result = await pool.query(
            `UPDATE auctions SET ${setClause}, updated_at = NOW()
         WHERE id = $1
         RETURNING *, id as category_id`,
            [id, ...values]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }

        res.json({
            message: 'Category updated successfully',
            category: result.rows[0]
        });
    } catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({ error: 'Failed to update category' });
    }
});

router.post('/:id/image', upload.single('image'), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded' });
        }

        const categoryCheck = await pool.query('SELECT id FROM auctions WHERE id = $1', [id]);
        if (categoryCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }

        const base64Image = req.file.buffer.toString('base64');
        const mimeType = req.file.mimetype;
        const dataUrl = `data:${mimeType};base64,${base64Image}`;

        const result = await pool.query(
            `UPDATE auctions SET image_data = $1, updated_at = NOW()
             WHERE id = $2
             RETURNING id, title, image_data, id as category_id`,
            [dataUrl, id]
        );

        res.json({
            message: 'Image uploaded successfully',
            image_data: dataUrl,
            category: result.rows[0]
        });
    } catch (error) {
        console.error('Upload category image error:', error);
        res.status(500).json({ error: 'Failed to upload image' });
    }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const bidsResult = await pool.query(
            `SELECT COUNT(*) as bid_count FROM bids b
       JOIN lots l ON b.lot_id = l.id
       WHERE l.auction_id = $1`,
            [id]
        );

        if (parseInt(bidsResult.rows[0].bid_count) > 0) {
            return res.status(400).json({
                error: 'Cannot delete category with existing bids'
            });
        }

        const result = await pool.query('DELETE FROM auctions WHERE id = $1 RETURNING id', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }

        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({ error: 'Failed to delete category' });
    }
});

export default router;
