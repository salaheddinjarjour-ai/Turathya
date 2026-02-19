import { Router, Response } from 'express';
import { pool } from '../../config/database';
import { authenticate, requireAdmin, AuthRequest } from '../../middleware/auth';

const router = Router();

// All routes require admin authentication
router.use(authenticate, requireAdmin);

// Get all users with optional status filter
router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const { status, role } = req.query;

        let query = 'SELECT id, email, full_name, role, status, created_at FROM users WHERE 1=1';
        const params: any[] = [];

        if (status) {
            params.push(status);
            query += ` AND status = $${params.length}`;
        }

        if (role) {
            params.push(role);
            query += ` AND role = $${params.length}`;
        }

        query += ' ORDER BY created_at DESC';

        const result = await pool.query(query, params);
        res.json({ users: result.rows });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to get users' });
    }
});

// Get user by ID
router.get('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'SELECT id, email, full_name, role, status, created_at FROM users WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user: result.rows[0] });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

// Approve user (works for pending, suspended, and rejected users)
router.patch('/:id/approve', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `UPDATE users SET status = 'approved', updated_at = NOW()
       WHERE id = $1 AND status IN ('pending', 'suspended', 'rejected')
       RETURNING id, email, full_name, status`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found or already processed' });
        }

        res.json({
            message: 'User approved successfully',
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Approve user error:', error);
        res.status(500).json({ error: 'Failed to approve user' });
    }
});

// Reject user (only for pending users)
router.patch('/:id/reject', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `UPDATE users SET status = 'rejected', updated_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING id, email, full_name, status`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found or already processed' });
        }

        res.json({
            message: 'User rejected',
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Reject user error:', error);
        res.status(500).json({ error: 'Failed to reject user' });
    }
});

// Suspend user
router.patch('/:id/suspend', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `UPDATE users SET status = 'suspended', updated_at = NOW()
       WHERE id = $1
       RETURNING id, email, full_name, status`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            message: 'User suspended',
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Suspend user error:', error);
        res.status(500).json({ error: 'Failed to suspend user' });
    }
});

// Unsuspend / reactivate user (works for suspended and rejected)
router.patch('/:id/unsuspend', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `UPDATE users SET status = 'approved', updated_at = NOW()
       WHERE id = $1 AND status IN ('suspended', 'rejected')
       RETURNING id, email, full_name, status`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found or not suspended/rejected' });
        }

        res.json({
            message: 'User reactivated successfully',
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Unsuspend user error:', error);
        res.status(500).json({ error: 'Failed to reactivate user' });
    }
});

// Delete user
router.delete('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        // Prevent deleting yourself
        if (id === req.user!.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        const result = await pool.query(
            'DELETE FROM users WHERE id = $1 RETURNING id',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

export default router;
