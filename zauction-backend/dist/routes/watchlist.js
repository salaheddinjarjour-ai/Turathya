"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
// Get user's watchlist
router.get('/', async (req, res) => {
    try {
        const user_id = req.user.id;
        const result = await database_1.pool.query(`SELECT w.*, l.title, l.lot_number, l.current_bid, l.starting_bid, l.image_data,
        a.title as auction_title, a.end_date as auction_end_date,
        COALESCE(
          (SELECT url FROM lot_media WHERE lot_id = l.id ORDER BY display_order LIMIT 1),
          l.image_data
        ) as primary_image
       FROM watchlist w
       JOIN lots l ON w.lot_id = l.id
       JOIN auctions a ON l.auction_id = a.id
       WHERE w.user_id = $1
       ORDER BY w.created_at DESC`, [user_id]);
        res.json({ watchlist: result.rows });
    }
    catch (error) {
        console.error('Get watchlist error:', error);
        res.status(500).json({ error: 'Failed to get watchlist' });
    }
});
// Add to watchlist
router.post('/', async (req, res) => {
    try {
        const { lot_id } = req.body;
        const user_id = req.user.id;
        console.log('=== WATCHLIST POST ===');
        console.log('Request body:', req.body);
        console.log('lot_id:', lot_id);
        console.log('user_id:', user_id);
        if (!lot_id) {
            console.log('ERROR: lot_id missing');
            return res.status(400).json({ error: 'lot_id is required' });
        }
        // Check lot exists
        console.log('Checking if lot exists...');
        const lotCheck = await database_1.pool.query('SELECT id FROM lots WHERE id = $1', [lot_id]);
        console.log('Lot check result:', lotCheck.rows);
        if (lotCheck.rows.length === 0) {
            console.log('ERROR: Lot not found');
            return res.status(404).json({ error: 'Lot not found' });
        }
        console.log('Inserting into watchlist...');
        const result = await database_1.pool.query(`INSERT INTO watchlist (user_id, lot_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, lot_id) DO NOTHING
       RETURNING *`, [user_id, lot_id]);
        console.log('Insert result:', result.rows);
        if (result.rows.length === 0) {
            console.log('Already in watchlist');
            return res.status(200).json({ message: 'Already in watchlist' });
        }
        console.log('Successfully added to watchlist');
        res.status(201).json({
            message: 'Added to watchlist',
            watchlist_item: result.rows[0]
        });
    }
    catch (error) {
        console.error('=== ADD TO WATCHLIST ERROR ===');
        console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
        console.error('Error message:', error instanceof Error ? error.message : String(error));
        console.error('Full error:', error);
        console.error('Stack trace:', error instanceof Error ? error.stack : 'N/A');
        res.status(500).json({ error: 'Failed to add to watchlist' });
    }
});
// Remove from watchlist
router.delete('/:lotId', async (req, res) => {
    try {
        const { lotId } = req.params;
        const user_id = req.user.id;
        const result = await database_1.pool.query('DELETE FROM watchlist WHERE user_id = $1 AND lot_id = $2 RETURNING id', [user_id, lotId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Not in watchlist' });
        }
        res.json({ message: 'Removed from watchlist' });
    }
    catch (error) {
        console.error('Remove from watchlist error:', error);
        res.status(500).json({ error: 'Failed to remove from watchlist' });
    }
});
exports.default = router;
//# sourceMappingURL=watchlist.js.map