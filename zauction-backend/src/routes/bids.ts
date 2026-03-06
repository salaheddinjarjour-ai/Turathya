import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { pool } from '../config/database';
import { authenticate, requireApproved, AuthRequest } from '../middleware/auth';

const router = Router();

// Tiered bid increment based on current bid value
function getBidIncrement(currentBid: number): number {
    if (currentBid < 100) return 10;
    if (currentBid < 500) return 20;
    if (currentBid < 1000) return 50;
    if (currentBid < 10000) return 100;
    return 500;
}

// All routes require authentication and approved status
router.use(authenticate, requireApproved);

// Place a bid
router.post('/',
    [
        body('lot_id').isUUID(),
        body('amount').isFloat({ min: 0 })
    ],
    async (req: AuthRequest, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { lot_id, amount } = req.body;
            const user_id = req.user!.id;

            // Start transaction
            const client = await pool.connect();

            try {
                await client.query('BEGIN');

                // Get lot with auction info
                const lotResult = await client.query(
                    `SELECT l.*, a.start_date, a.end_date, a.status as auction_status,
            (SELECT MAX(amount) FROM bids WHERE lot_id = l.id) as current_bid
           FROM lots l
           JOIN auctions a ON l.auction_id = a.id
           WHERE l.id = $1
           FOR UPDATE`,
                    [lot_id]
                );

                if (lotResult.rows.length === 0) {
                    await client.query('ROLLBACK');
                    return res.status(404).json({ error: 'Lot not found' });
                }

                const lot = lotResult.rows[0];
                const now = new Date();

                // Validation 1: Check auction is active
                if (lot.auction_status !== 'active') {
                    await client.query('ROLLBACK');
                    return res.status(400).json({ error: 'Auction is not active' });
                }

                // Validation 2: Check auction time window
                if (now < new Date(lot.start_date)) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({ error: 'Auction has not started yet' });
                }

                if (now > new Date(lot.end_date)) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({ error: 'Auction has ended' });
                }

                // Validation 3: Check minimum bid using tiered increments
                const currentBidValue = lot.current_bid ? parseFloat(lot.current_bid) : 0;
                const increment = getBidIncrement(currentBidValue);
                const minBid = currentBidValue > 0
                    ? currentBidValue + increment
                    : parseFloat(lot.starting_bid);

                if (amount < minBid) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({
                        error: `Minimum bid is $${minBid.toFixed(2)}`,
                        minimum_bid: minBid,
                        increment: increment
                    });
                }

                // Validation 4: Check user isn't outbidding themselves
                const lastBidResult = await client.query(
                    `SELECT user_id FROM bids 
           WHERE lot_id = $1 
           ORDER BY created_at DESC 
           LIMIT 1`,
                    [lot_id]
                );

                if (lastBidResult.rows.length > 0 && lastBidResult.rows[0].user_id === user_id) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({ error: 'You are already the highest bidder' });
                }

                // Place bid
                const bidResult = await client.query(
                    `INSERT INTO bids (id, lot_id, user_id, amount, status)
           VALUES (gen_random_uuid(), $1, $2, $3, 'active')
           RETURNING *`,
                    [lot_id, user_id, amount]
                );

                const bid = bidResult.rows[0];

                await client.query('COMMIT');

                const io = req.app.get('io');
                if (io) {
                    io.to(`lot-${lot_id}`).emit('lot-updated', {
                        lotId: lot_id,
                        currentBid: bid.amount,
                        highestBidderId: user_id
                    });
                }

                res.status(201).json({
                    message: 'Bid placed successfully',
                    bid: {
                        id: bid.id,
                        lot_id: bid.lot_id,
                        amount: bid.amount,
                        created_at: bid.created_at
                    }
                });
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        } catch (error) {
            console.error('Place bid error:', error);
            res.status(500).json({ error: 'Failed to place bid' });
        }
    }
);

// Get user's bids
router.get('/my-bids', async (req: AuthRequest, res: Response) => {
    try {
        const user_id = req.user!.id;

        const result = await pool.query(
            `SELECT b.*, 
        l.id as lot_id,
        l.title as lot_title, 
        l.lot_number, 
        COALESCE((SELECT MAX(b2.amount) FROM bids b2 WHERE b2.lot_id = l.id), l.starting_bid) as current_bid,
        (SELECT b3.user_id FROM bids b3 WHERE b3.lot_id = l.id ORDER BY b3.amount DESC, b3.created_at DESC LIMIT 1) as highest_bidder_id,
        l.starting_bid,
        l.auction_id,
        a.title as auction_title, 
        a.end_date as auction_end_date
       FROM bids b
       JOIN lots l ON b.lot_id = l.id
       JOIN auctions a ON l.auction_id = a.id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC`,
            [user_id]
        );

        res.json({ bids: result.rows });
    } catch (error) {
        console.error('Get my bids error:', error);
        res.status(500).json({ error: 'Failed to get bids' });
    }
});

export default router;
