import { Router, Response } from 'express';
import { pool } from '../../config/database';
import { authenticate, requireAdmin, AuthRequest } from '../../middleware/auth';

const router = Router();

// All routes require admin authentication
router.use(authenticate, requireAdmin);

// Get dashboard statistics
router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        // Get total auctions
        const auctionsResult = await pool.query('SELECT COUNT(*) as count FROM auctions');
        const totalAuctions = parseInt(auctionsResult.rows[0].count);

        // Get active lots (lots in active status)
        const activeLotsResult = await pool.query(
            `SELECT COUNT(*) as count FROM lots 
             WHERE status = 'active'`
        );
        const activeLots = parseInt(activeLotsResult.rows[0].count);

        // Get total users
        const usersResult = await pool.query('SELECT COUNT(*) as count FROM users');
        const totalUsers = parseInt(usersResult.rows[0].count);

        // Get pending approvals
        const pendingResult = await pool.query(
            `SELECT COUNT(*) as count FROM users WHERE status = 'pending'`
        );
        const pendingApprovals = parseInt(pendingResult.rows[0].count);

        res.json({
            stats: {
                totalCategories: totalAuctions,
                totalAuctions,
                activeLots,
                totalUsers,
                pendingApprovals
            }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to get statistics' });
    }
});

export default router;
