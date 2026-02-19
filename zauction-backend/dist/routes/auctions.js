"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const router = (0, express_1.Router)();
// Get auctions (public)
router.get('/', async (req, res) => {
    try {
        const { category, status, featured } = req.query;
        let query = `
      SELECT a.*, 
        (SELECT COUNT(*) FROM lots WHERE auction_id = a.id) as lot_count,
        (SELECT COUNT(DISTINCT b.user_id) 
         FROM bids b 
         JOIN lots l ON b.lot_id = l.id 
         WHERE l.auction_id = a.id) as unique_bidders
      FROM auctions a
      WHERE 1=1
    `;
        const params = [];
        if (status) {
            const statusValue = String(status);
            const statuses = statusValue
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean);
            if (statuses.length === 1) {
                params.push(statuses[0]);
                query += ` AND a.status = $${params.length}`;
            }
            else if (statuses.length > 1) {
                params.push(statuses);
                query += ` AND a.status = ANY($${params.length})`;
            }
        }
        if (category) {
            params.push(category);
            query += ` AND a.category = $${params.length}`;
        }
        if (featured === 'true') {
            // Featured auctions are the ones with most unique bidders
            query += ` ORDER BY unique_bidders DESC, a.end_date ASC LIMIT 6`;
        }
        else {
            query += ' ORDER BY a.end_date ASC';
        }
        const result = await database_1.pool.query(query, params);
        res.json({ auctions: result.rows });
    }
    catch (error) {
        console.error('Get auctions error:', error);
        res.status(500).json({ error: 'Failed to get auctions' });
    }
});
// Get single auction (public)
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await database_1.pool.query(`SELECT a.*, 
        (SELECT COUNT(*) FROM lots WHERE auction_id = a.id) as lot_count
       FROM auctions a
       WHERE a.id = $1`, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Auction not found' });
        }
        res.json({ auction: result.rows[0] });
    }
    catch (error) {
        console.error('Get auction error:', error);
        res.status(500).json({ error: 'Failed to get auction' });
    }
});
// Get lots in auction (public)
router.get('/:id/lots', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await database_1.pool.query(`SELECT l.*, a.end_date, a.image_data as auction_image,
        (SELECT COUNT(*) FROM lot_media WHERE lot_id = l.id) as media_count,
        COALESCE(
          (SELECT url FROM lot_media WHERE lot_id = l.id ORDER BY display_order LIMIT 1),
          l.image_data
        ) as primary_image
       FROM lots l
       JOIN auctions a ON l.auction_id = a.id
       WHERE l.auction_id = $1
       ORDER BY l.lot_number ASC`, [id]);
        res.json({ lots: result.rows });
    }
    catch (error) {
        console.error('Get auction lots error:', error);
        res.status(500).json({ error: 'Failed to get lots' });
    }
});
exports.default = router;
//# sourceMappingURL=auctions.js.map