import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { pool } from '../../config/database';
import { authenticate, requireAdmin, AuthRequest } from '../../middleware/auth';

const router = Router();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// All routes require admin authentication
router.use(authenticate, requireAdmin);

// Get all lots
router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const { auction_id } = req.query;

        let query = `
      SELECT l.*, a.title as auction_title,
        l.title_en, l.title_ar, l.description_en, l.description_ar,
        l.category_en, l.category_ar, l.condition_en, l.condition_ar,
        (SELECT COUNT(*) FROM lot_media WHERE lot_id = l.id) as media_count,
        COALESCE(
          (SELECT url FROM lot_media WHERE lot_id = l.id ORDER BY display_order LIMIT 1),
          l.image_data
        ) as primary_image,
        (SELECT COUNT(*) FROM bids WHERE lot_id = l.id) as bid_count,
        (SELECT MAX(amount) FROM bids WHERE lot_id = l.id) as current_bid,
        (SELECT u.full_name FROM bids b JOIN users u ON b.user_id = u.id WHERE b.lot_id = l.id ORDER BY b.amount DESC LIMIT 1) as bidder_name,
        (SELECT u.email FROM bids b JOIN users u ON b.user_id = u.id WHERE b.lot_id = l.id ORDER BY b.amount DESC LIMIT 1) as bidder_email,
        (SELECT u.phone FROM bids b JOIN users u ON b.user_id = u.id WHERE b.lot_id = l.id ORDER BY b.amount DESC LIMIT 1) as bidder_phone
      FROM lots l
      JOIN auctions a ON l.auction_id = a.id
      WHERE 1=1
    `;
        const params: any[] = [];

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

// Create lot
router.post('/',
    [
        body('auction_id').isUUID(),
        body('lot_number').isInt({ min: 1 }),
        body('title').trim().notEmpty(),
        body('starting_bid').isFloat({ min: 0 }),
        body('bid_increment').optional().isFloat({ min: 0 })
    ],
    async (req: AuthRequest, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const {
                auction_id,
                lot_number,
                title,
                description,
                category,
                condition,
                provenance,
                title_en,
                title_ar,
                description_en,
                description_ar,
                category_en,
                category_ar,
                condition_en,
                condition_ar,
                provenance_en,
                provenance_ar,
                estimate_low,
                estimate_high,
                starting_bid,
                reserve_price,
                bid_increment = 100
            } = req.body;

            // Check auction exists
            const auctionCheck = await pool.query(
                'SELECT id FROM auctions WHERE id = $1',
                [auction_id]
            );

            if (auctionCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Auction not found' });
            }

            const result = await pool.query(
                `INSERT INTO lots (
          id, auction_id, lot_number, title, description, category, condition,
          provenance, title_en, title_ar, description_en, description_ar,
          category_en, category_ar, condition_en, condition_ar,
          provenance_en, provenance_ar,
          estimate_low, estimate_high, starting_bid, reserve_price,
          bid_increment, status, created_at, updated_at
        ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, 'active', NOW(), NOW())
        RETURNING *`,
                [auction_id, lot_number,
                    title || title_en || title_ar,
                    description || description_en || description_ar,
                    category || category_en || category_ar,
                    condition || condition_en || condition_ar,
                    provenance || provenance_en || provenance_ar,
                    title_en, title_ar, description_en, description_ar,
                    category_en, category_ar, condition_en, condition_ar,
                    provenance_en, provenance_ar,
                    estimate_low, estimate_high, starting_bid, reserve_price,
                    bid_increment]
            );

            res.status(201).json({
                message: 'Lot created successfully',
                lot: result.rows[0]
            });
        } catch (error: any) {
            if (error.code === '23505') { // Unique constraint violation
                return res.status(400).json({ error: 'Lot number already exists in this auction' });
            }
            console.error('Create lot error:', error);
            res.status(500).json({ error: 'Failed to create lot' });
        }
    }
);

// Update lot
router.patch('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const fields = Object.keys(updates);
        if (fields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        const setClause = fields.map((field, idx) => `${field} = $${idx + 2}`).join(', ');
        const values = [id, ...fields.map(field => updates[field])];

        const result = await pool.query(
            `UPDATE lots SET ${setClause}, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Lot not found' });
        }

        res.json({
            message: 'Lot updated successfully',
            lot: result.rows[0]
        });
    } catch (error) {
        console.error('Update lot error:', error);
        res.status(500).json({ error: 'Failed to update lot' });
    }
});

// Upload media to lot
router.post('/:id/media', upload.single('file'), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { media_type = 'image', thumbnail } = req.body;

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Check lot exists
        const lotCheck = await pool.query('SELECT id FROM lots WHERE id = $1', [id]);
        if (lotCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Lot not found' });
        }

        // Convert buffer to base64 data URL
        const base64Data = req.file.buffer.toString('base64');
        const mimeType = req.file.mimetype;
        const dataUrl = `data:${mimeType};base64,${base64Data}`;

        // Use provided thumbnail or fallback to main media
        const thumbnailUrl = thumbnail || dataUrl;

        // Get current max display order
        const orderResult = await pool.query(
            'SELECT COALESCE(MAX(display_order), -1) + 1 as next_order FROM lot_media WHERE lot_id = $1',
            [id]
        );
        const display_order = orderResult.rows[0].next_order;

        // Save to database as base64
        const result = await pool.query(
            `INSERT INTO lot_media (id, lot_id, media_type, url, thumbnail_url, display_order)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
       RETURNING *`,
            [id, media_type, dataUrl, thumbnailUrl, display_order]
        );

        res.status(201).json({
            message: 'Media uploaded successfully',
            media: result.rows[0]
        });
    } catch (error) {
        console.error('Upload media error:', error);
        res.status(500).json({ error: 'Failed to upload media' });
    }
});

// Delete media
router.delete('/media/:mediaId', async (req: AuthRequest, res: Response) => {
    try {
        const { mediaId } = req.params;

        // Get media info
        const mediaResult = await pool.query(
            'SELECT * FROM lot_media WHERE id = $1',
            [mediaId]
        );

        if (mediaResult.rows.length === 0) {
            return res.status(404).json({ error: 'Media not found' });
        }

        // Delete from database (base64 data stored in url field)
        await pool.query('DELETE FROM lot_media WHERE id = $1', [mediaId]);

        res.json({ message: 'Media deleted successfully' });
    } catch (error) {
        console.error('Delete media error:', error);
        res.status(500).json({ error: 'Failed to delete media' });
    }
});

// Upload lot image (base64 storage)
router.post('/:id/image', upload.single('image'), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        // Check if lot exists
        const lotCheck = await pool.query('SELECT id FROM lots WHERE id = $1', [id]);
        if (lotCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Lot not found' });
        }

        // Convert image to base64 data URL
        const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

        // Update lot with image_data
        await pool.query(
            'UPDATE lots SET image_data = $1, updated_at = NOW() WHERE id = $2',
            [base64Image, id]
        );

        res.json({ 
            message: 'Image uploaded successfully',
            image_data: base64Image
        });
    } catch (error) {
        console.error('Upload lot image error:', error);
        res.status(500).json({ error: 'Failed to upload image' });
    }
});

// Delete lot
router.delete('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        // Check if lot has bids
        const bidsResult = await pool.query(
            'SELECT COUNT(*) as bid_count FROM bids WHERE lot_id = $1',
            [id]
        );

        if (parseInt(bidsResult.rows[0].bid_count) > 0) {
            return res.status(400).json({
                error: 'Cannot delete lot with existing bids'
            });
        }

        const result = await pool.query(
            'DELETE FROM lots WHERE id = $1 RETURNING id',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Lot not found' });
        }

        res.json({ message: 'Lot deleted successfully' });
    } catch (error) {
        console.error('Delete lot error:', error);
        res.status(500).json({ error: 'Failed to delete lot' });
    }
});

// Get all bidders for a lot (highest first)
router.get('/:id/bidders', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const lotResult = await pool.query(
            `SELECT l.id, l.title, l.lot_number, a.title as auction_title
       FROM lots l
       JOIN auctions a ON l.auction_id = a.id
       WHERE l.id = $1`,
            [id]
        );

        if (lotResult.rows.length === 0) {
            return res.status(404).json({ error: 'Lot not found' });
        }

        const bidsResult = await pool.query(
            `SELECT b.id, b.amount, b.created_at, b.status,
              u.id as user_id, u.full_name, u.email, u.phone
       FROM bids b
       JOIN users u ON b.user_id = u.id
       WHERE b.lot_id = $1
       ORDER BY b.amount DESC, b.created_at ASC`,
            [id]
        );

        const bidders = bidsResult.rows.map((row, index) => ({
            rank: index + 1,
            bid_id: row.id,
            amount: row.amount,
            created_at: row.created_at,
            status: row.status,
            user: {
                id: row.user_id,
                full_name: row.full_name,
                email: row.email,
                phone: row.phone
            }
        }));

        res.json({
            lot: lotResult.rows[0],
            bidders
        });
    } catch (error) {
        console.error('Get lot bidders error:', error);
        res.status(500).json({ error: 'Failed to get bidders' });
    }
});

// Remove top bid for a lot and promote next highest bid
router.delete('/:id/top-bid', async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();

    try {
        const { id } = req.params;

        await client.query('BEGIN');

        const lotLockResult = await client.query(
            `SELECT id, title, lot_number
       FROM lots
       WHERE id = $1
       FOR UPDATE`,
            [id]
        );

        if (lotLockResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Lot not found' });
        }

        const topBidResult = await client.query(
            `SELECT b.id, b.amount, u.full_name, u.email
       FROM bids b
       JOIN users u ON b.user_id = u.id
       WHERE b.lot_id = $1
       ORDER BY b.amount DESC, b.created_at ASC
       LIMIT 1
       FOR UPDATE`,
            [id]
        );

        if (topBidResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'No bids found for this lot' });
        }

        const removedBid = topBidResult.rows[0];

        await client.query('DELETE FROM bids WHERE id = $1', [removedBid.id]);

        const aggregateResult = await client.query(
            `SELECT COALESCE(MAX(amount), NULL) as current_bid,
              COUNT(*)::int as bid_count
       FROM bids
       WHERE lot_id = $1`,
            [id]
        );

        const { current_bid, bid_count } = aggregateResult.rows[0];

        await client.query(
            `UPDATE lots
       SET current_bid = $1,
           bid_count = $2,
           updated_at = NOW()
       WHERE id = $3`,
            [current_bid, bid_count, id]
        );

        await client.query(
            `UPDATE bids
       SET status = 'outbid'
       WHERE lot_id = $1`,
            [id]
        );

        if (bid_count > 0) {
            await client.query(
                `UPDATE bids
         SET status = 'winning'
         WHERE id = (
            SELECT id
            FROM bids
            WHERE lot_id = $1
            ORDER BY amount DESC, created_at ASC
            LIMIT 1
         )`,
                [id]
            );
        }

        await client.query('COMMIT');

        res.json({
            message: 'Top bidder removed successfully',
            removed_bidder: {
                name: removedBid.full_name,
                email: removedBid.email,
                amount: removedBid.amount
            },
            audit: {
                removed_at: new Date().toISOString(),
                removed_by: {
                    id: req.user?.id,
                    email: req.user?.email
                }
            },
            lot: {
                id,
                current_bid,
                bid_count
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Remove top bid error:', error);
        res.status(500).json({ error: 'Failed to remove top bidder' });
    } finally {
        client.release();
    }
});

export default router;
