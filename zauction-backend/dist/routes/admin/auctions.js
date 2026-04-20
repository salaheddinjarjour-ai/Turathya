"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const multer_1 = __importDefault(require("multer"));
const cloudinary_1 = require("cloudinary");
const database_1 = require("../../config/database");
const auth_1 = require("../../middleware/auth");
const whatsappBridge_1 = require("../../services/whatsappBridge");
const router = (0, express_1.Router)();
// Configure Cloudinary
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});
// Configure multer for file uploads
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});
// All routes require admin authentication
router.use(auth_1.authenticate, auth_1.requireAdmin);
// Get all auctions
router.get('/', async (req, res) => {
    try {
        const result = await database_1.pool.query(`SELECT a.*,
        a.title_en, a.title_ar, a.description_en, a.description_ar,
        a.category_en, a.category_ar, a.location_en, a.location_ar,
        (SELECT COUNT(*) FROM lots WHERE auction_id = a.id) as lot_count
       FROM auctions a
       ORDER BY a.created_at DESC`);
        res.json({ auctions: result.rows });
    }
    catch (error) {
        console.error('Get auctions error:', error);
        res.status(500).json({ error: 'Failed to get auctions' });
    }
});
// Create auction
router.post('/', [
    (0, express_validator_1.body)('title').trim().notEmpty(),
    (0, express_validator_1.body)('start_date').isISO8601(),
    (0, express_validator_1.body)('end_date').isISO8601(),
    (0, express_validator_1.body)('buyers_premium').optional().isFloat({ min: 0, max: 100 })
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { title, description, category, location, title_en, title_ar, description_en, description_ar, category_en, category_ar, location_en, location_ar, start_date, end_date, image_url, featured = false } = req.body;
        // Validate dates
        if (new Date(end_date) <= new Date(start_date)) {
            return res.status(400).json({ error: 'End date must be after start date' });
        }
        // Determine status based on dates
        const now = new Date();
        const startDate = new Date(start_date);
        const endDate = new Date(end_date);
        let status = 'upcoming';
        if (now >= startDate && now < endDate) {
            status = 'active';
        }
        else if (now >= endDate) {
            status = 'ended';
        }
        const result = await database_1.pool.query(`INSERT INTO auctions (
          id, title, description, category, location,
          title_en, title_ar, description_en, description_ar,
          category_en, category_ar, location_en, location_ar,
          start_date, end_date,
          buyers_premium, image_url, featured, status, created_by, created_at, updated_at
        ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 0, $15, $16, $17, $18, NOW(), NOW())
        RETURNING *`, [title || title_en || title_ar,
            description || description_en || description_ar,
            category || category_en || category_ar,
            location || location_en || location_ar,
            title_en, title_ar, description_en, description_ar,
            category_en, category_ar, location_en, location_ar,
            start_date, end_date,
            image_url, featured, status, req.user.id]);
        res.status(201).json({
            message: 'Auction created successfully',
            auction: result.rows[0]
        });
        void (0, whatsappBridge_1.notifyNewAuctionCreated)(result.rows[0]).catch((error) => {
            console.error('Automated WhatsApp notification (new auction) failed:', error);
        });
        if (featured === true || featured === 'true') {
            void (0, whatsappBridge_1.notifyAuctionFeatured)(result.rows[0]).catch((error) => {
                console.error('Automated WhatsApp notification (featured auction) failed:', error);
            });
        }
    }
    catch (error) {
        console.error('Create auction error:', error);
        res.status(500).json({ error: 'Failed to create auction' });
    }
});
// Update auction
router.patch('/:id', [
    (0, express_validator_1.body)('title').optional().trim().notEmpty(),
    (0, express_validator_1.body)('start_date').optional().isISO8601(),
    (0, express_validator_1.body)('end_date').optional().isISO8601()
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { id } = req.params;
        const updates = req.body;
        // Build dynamic update query
        const fields = Object.keys(updates);
        if (fields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }
        const setClause = fields.map((field, idx) => `${field} = $${idx + 2}`).join(', ');
        const values = [id, ...fields.map(field => updates[field])];
        const result = await database_1.pool.query(`UPDATE auctions SET ${setClause}, updated_at = NOW()
         WHERE id = $1
         RETURNING *`, values);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Auction not found' });
        }
        res.json({
            message: 'Auction updated successfully',
            auction: result.rows[0]
        });
        if (Object.prototype.hasOwnProperty.call(updates, 'featured') && (updates.featured === true || updates.featured === 'true')) {
            void (0, whatsappBridge_1.notifyAuctionFeatured)(result.rows[0]).catch((error) => {
                console.error('Automated WhatsApp notification (featured auction) failed:', error);
            });
        }
    }
    catch (error) {
        console.error('Update auction error:', error);
        res.status(500).json({ error: 'Failed to update auction' });
    }
});
// Upload auction image (stores as base64 in database)
router.post('/:id/image', upload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded' });
        }
        // Check auction exists
        const auctionCheck = await database_1.pool.query('SELECT id FROM auctions WHERE id = $1', [id]);
        if (auctionCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Auction not found' });
        }
        // Convert image to base64
        const base64Image = req.file.buffer.toString('base64');
        const mimeType = req.file.mimetype;
        const dataUrl = `data:${mimeType};base64,${base64Image}`;
        // Update auction with base64 image data
        const result = await database_1.pool.query(`UPDATE auctions SET image_data = $1, updated_at = NOW()
             WHERE id = $2
             RETURNING id, title, image_data`, [dataUrl, id]);
        res.json({
            message: 'Image uploaded successfully',
            image_data: dataUrl,
            auction: result.rows[0]
        });
    }
    catch (error) {
        console.error('Upload image error:', error);
        res.status(500).json({ error: 'Failed to upload image' });
    }
});
// Delete auction
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Check if auction has bids
        const bidsResult = await database_1.pool.query(`SELECT COUNT(*) as bid_count FROM bids b
       JOIN lots l ON b.lot_id = l.id
       WHERE l.auction_id = $1`, [id]);
        if (parseInt(bidsResult.rows[0].bid_count) > 0) {
            return res.status(400).json({
                error: 'Cannot delete auction with existing bids'
            });
        }
        const result = await database_1.pool.query('DELETE FROM auctions WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Auction not found' });
        }
        res.json({ message: 'Auction deleted successfully' });
    }
    catch (error) {
        console.error('Delete auction error:', error);
        res.status(500).json({ error: 'Failed to delete auction' });
    }
});
exports.default = router;
//# sourceMappingURL=auctions.js.map