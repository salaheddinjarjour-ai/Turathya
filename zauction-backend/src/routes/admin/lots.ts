import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { pool } from '../../config/database';
import { authenticate, requireAdmin, AuthRequest } from '../../middleware/auth';
import { buildUpdateSet, LOT_UPDATABLE_COLUMNS } from '../../utils/buildUpdate';
import { notifyNewLotCreated } from '../../services/whatsappBridge';

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
        const { auction_id, category_id } = req.query;

        let query = `
            SELECT l.*, a.title as auction_title,
                l.auction_id as category_id, a.title as category_title,
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
      LEFT JOIN auctions a ON l.auction_id = a.id
      WHERE 1=1
    `;
        const params: any[] = [];

        const resolvedCategoryId = category_id || auction_id;
        if (resolvedCategoryId) {
            params.push(resolvedCategoryId);
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
        // NOTE: `optional()` alone only skips `undefined`. The admin form sends
        // explicit nulls for every field the user left blank, so each of these
        // needs `nullable: true` — otherwise a gallery-only lot (no dates, no
        // starting bid) is rejected with a 400 that the UI cannot explain.
        body('auction_id').optional({ nullable: true }).isUUID(),
        body('category_id').optional({ nullable: true }).isUUID(),
        body('lot_number').isInt({ min: 1 }).withMessage('Lot number is required and must be a positive whole number.'),
        body('title').trim().notEmpty().withMessage('A title is required (English or Arabic).'),
        // Optional: gallery-only pieces are displayed for enquiry and never bid on.
        body('starting_bid').optional({ nullable: true }).isFloat({ min: 0 }),
        body('bid_increment').optional({ nullable: true }).isFloat({ min: 0 }),
        body('start_date').optional({ nullable: true }).isISO8601(),
        body('end_date').optional({ nullable: true }).isISO8601(),
        // Custom: both dates must be provided together
        body('start_date').custom((val, { req }) => {
            const has_start = !!val;
            const has_end   = !!(req.body?.end_date);
            if (has_start !== has_end) throw new Error('Both start_date and end_date must be provided together, or neither.');
            return true;
        }),
        // A lot with a bidding window must also have a starting bid, or it renders
        // a countdown that nothing can be bid against. This mirrors the
        // `lot_has_auction` rule in routes/lots.ts and the guard in routes/bids.ts.
        body('starting_bid').custom((val, { req }) => {
            const hasWindow = !!(req.body?.start_date && req.body?.end_date);
            const hasBid = val !== null && val !== undefined && val !== '' && Number(val) > 0;
            if (hasWindow && !hasBid) {
                throw new Error('An auction item needs a starting bid greater than 0.');
            }
            return true;
        })
    ],
    async (req: AuthRequest, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const {
                auction_id,
                category_id,
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
                bid_increment = 100,
                start_date,
                end_date,
                show_in_gallery = false
            } = req.body;

            const resolvedCategoryId = category_id || auction_id || null;

            // Validate group exists only when provided
            let auctionTitle: string | null = null;
            if (resolvedCategoryId) {
                const auctionCheck = await pool.query(
                    'SELECT id, title FROM auctions WHERE id = $1',
                    [resolvedCategoryId]
                );
                if (auctionCheck.rows.length === 0) {
                    return res.status(404).json({ error: 'Collection/group not found' });
                }
                auctionTitle = auctionCheck.rows[0]?.title;
            }

            const result = await pool.query(
                `INSERT INTO lots (
          id, auction_id, lot_number, title, description, category, condition,
          provenance, title_en, title_ar, description_en, description_ar,
          category_en, category_ar, condition_en, condition_ar,
          provenance_en, provenance_ar,
          estimate_low, estimate_high, starting_bid, reserve_price,
          bid_increment, start_date, end_date, show_in_gallery, status, created_at, updated_at
        ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, 'active', NOW(), NOW())
        RETURNING *`,
            [resolvedCategoryId, lot_number,
                    title || title_en || title_ar,
                    description || description_en || description_ar,
                    category || category_en || category_ar,
                    condition || condition_en || condition_ar,
                    provenance || provenance_en || provenance_ar,
                    title_en, title_ar, description_en, description_ar,
                    category_en, category_ar, condition_en, condition_ar,
                    provenance_en, provenance_ar,
                    estimate_low, estimate_high, starting_bid, reserve_price,
                    bid_increment, start_date || null, end_date || null, show_in_gallery === true || show_in_gallery === 'true']
            );

            res.status(201).json({
                message: 'Lot created successfully',
                lot: result.rows[0]
            });

            void notifyNewLotCreated({
                ...result.rows[0],
                auction_title: auctionTitle
            }).catch((error) => {
                console.error('Automated WhatsApp notification (new product) failed:', error);
            });
        } catch (error: any) {
            if (error.code === '23505') { // Unique constraint violation
                return res.status(400).json({ error: 'Lot number already exists in this category' });
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
        const updates: Record<string, any> = { ...req.body };

        // Map frontend alias 'category_id' → actual DB column 'auction_id'
        if ('category_id' in updates) {
            if (updates.category_id != null && updates.category_id !== '') {
                updates.auction_id = updates.category_id;
            }
            delete updates.category_id;
        }

        // Validate: both dates or neither
        const newStart = 'start_date' in updates ? updates.start_date : undefined;
        const newEnd   = 'end_date'   in updates ? updates.end_date   : undefined;
        if ((newStart && !newEnd) || (!newStart && newEnd)) {
            // One date being cleared — fetch the other from DB
            const existing = await pool.query('SELECT start_date, end_date FROM lots WHERE id = $1', [id]);
            if (existing.rows.length) {
                const merged_start = newStart !== undefined ? newStart : existing.rows[0].start_date;
                const merged_end   = newEnd   !== undefined ? newEnd   : existing.rows[0].end_date;
                if ((!!merged_start) !== (!!merged_end)) {
                    return res.status(400).json({ error: 'Both start_date and end_date must be set together, or both must be cleared.' });
                }
            }
        }

        const { fields, rejected, setClause, values } = buildUpdateSet(updates, LOT_UPDATABLE_COLUMNS);
        if (fields.length === 0) {
            return res.status(400).json({
                error: 'No updatable fields provided',
                ...(rejected.length ? { rejected_fields: rejected } : {})
            });
        }

        const result = await pool.query(
            `UPDATE lots SET ${setClause}, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
            [id, ...values]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Lot not found' });
        }

        // Audit log: record state transition
        const lot = result.rows[0];
        const hasAuctionDates = !!(lot.start_date && lot.end_date);
        const now = new Date();
        const lotState = !hasAuctionDates ? 'gallery'
            : (new Date(lot.end_date) < now ? 'ended'
            : (new Date(lot.start_date) <= now ? 'active_auction' : 'upcoming_auction'));
        console.log(`[AUDIT] Lot ${id} updated by ${req.user?.email || 'admin'} at ${now.toISOString()} — state: ${lotState}`);

        res.json({
            message: 'Lot updated successfully',
            lot,
            state: lotState
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
            `SELECT l.id, l.title, l.lot_number, a.title as auction_title, a.title as category_title
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
