"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../../config/database");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
// All routes require admin authentication
router.use(auth_1.authenticate, auth_1.requireAdmin);
// Get dashboard statistics
router.get('/', async (req, res) => {
    try {
        // Get total auctions
        const auctionsResult = await database_1.pool.query('SELECT COUNT(*) as count FROM auctions');
        const totalAuctions = parseInt(auctionsResult.rows[0].count);
        // Get active lots (lots in active status)
        const activeLotsResult = await database_1.pool.query(`SELECT COUNT(*) as count FROM lots 
             WHERE status = 'active'`);
        const activeLots = parseInt(activeLotsResult.rows[0].count);
        // Get total users
        const usersResult = await database_1.pool.query('SELECT COUNT(*) as count FROM users');
        const totalUsers = parseInt(usersResult.rows[0].count);
        // Get pending approvals
        const pendingResult = await database_1.pool.query(`SELECT COUNT(*) as count FROM users WHERE status = 'pending'`);
        const pendingApprovals = parseInt(pendingResult.rows[0].count);
        res.json({
            stats: {
                totalAuctions,
                activeLots,
                totalUsers,
                pendingApprovals
            }
        });
    }
    catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to get statistics' });
    }
});
exports.default = router;
//# sourceMappingURL=stats.js.map