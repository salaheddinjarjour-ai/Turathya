"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Tiered bid increment based on current bid value
function getBidIncrement(currentBid) {
    if (currentBid < 100)
        return 10;
    if (currentBid < 500)
        return 20;
    if (currentBid < 1000)
        return 50;
    if (currentBid < 10000)
        return 100;
    return 500;
}
// All routes require authentication and approved status
router.use(auth_1.authenticate, auth_1.requireApproved);
// Place a bid
router.post('/', [
    (0, express_validator_1.body)('lot_id').isUUID(),
    // Upper bound matches the lots.current_bid column type — Decimal(10,2).
    // Without it, an oversized bid reaches the DB and surfaces as a 500.
    (0, express_validator_1.body)('amount').isFloat({ min: 0, max: 99999999.99 })
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { lot_id, amount } = req.body;
        const user_id = req.user.id;
        // Start transaction
        const client = await database_1.pool.connect();
        try {
            await client.query('BEGIN');
            // Get lot with auction info.
            // Anything selected from `a` alongside `l.*` MUST be aliased: lots and
            // auctions share column names (start_date, end_date, status), and an
            // unaliased a.start_date silently overwrites l.start_date on the result
            // row — which is exactly how this route ended up validating bids against
            // the wrong time window.
            const lotResult = await client.query(`SELECT l.*,
                  a.status as auction_status,
            (SELECT MAX(amount) FROM bids WHERE lot_id = l.id) as current_bid
           FROM lots l
           JOIN auctions a ON l.auction_id = a.id
           WHERE l.id = $1
           FOR UPDATE OF l`, [lot_id]);
            if (lotResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Lot not found' });
            }
            const lot = lotResult.rows[0];
            const now = new Date();
            // Validation 1: Check the lot itself still accepts bids
            if (lot.status !== 'active') {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'This lot is no longer open for bidding' });
            }
            // Validation 2: Check auction is active
            if (lot.auction_status !== 'active') {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Auction is not active' });
            }
            // Validation 3: Check the lot is actually an auction item.
            // Migration 20260422 moved timing from the auction to the lot. This
            // mirrors the `lot_has_auction` expression in routes/lots.ts, which is
            // what the frontend uses to decide whether to show bidding UI at all —
            // the two must agree, or gallery-only items become biddable via the API.
            const hasBiddingWindow = Boolean(lot.start_date) && Boolean(lot.end_date);
            const hasStartingBid = lot.starting_bid !== null && parseFloat(lot.starting_bid) > 0;
            if (!hasBiddingWindow || !hasStartingBid) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'This lot is not open for bidding' });
            }
            // Validation 4: Check the bidding window
            if (now < new Date(lot.start_date)) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Bidding has not started yet' });
            }
            if (now > new Date(lot.end_date)) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Bidding has ended for this lot' });
            }
            // Validation 5: Check minimum bid using tiered increments
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
            // Validation 6: Check user isn't outbidding themselves
            const lastBidResult = await client.query(`SELECT user_id FROM bids 
           WHERE lot_id = $1 
           ORDER BY created_at DESC 
           LIMIT 1`, [lot_id]);
            if (lastBidResult.rows.length > 0 && lastBidResult.rows[0].user_id === user_id) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'You are already the highest bidder' });
            }
            // Place bid
            const bidResult = await client.query(`INSERT INTO bids (id, lot_id, user_id, amount, status)
           VALUES (gen_random_uuid(), $1, $2, $3, 'active')
           RETURNING *`, [lot_id, user_id, amount]);
            const bid = bidResult.rows[0];
            // Keep the denormalized columns on lots in sync. The list endpoint reads
            // l.* directly, so leaving these stale makes listings disagree with the
            // lot detail page (which computes MAX(amount) on the fly).
            const aggregateResult = await client.query(`UPDATE lots
             SET current_bid = agg.current_bid,
                 bid_count   = agg.bid_count,
                 updated_at  = NOW()
             FROM (
                SELECT MAX(amount) as current_bid, COUNT(*)::int as bid_count
                FROM bids
                WHERE lot_id = $1
             ) agg
           WHERE lots.id = $1
           RETURNING lots.current_bid, lots.bid_count`, [lot_id]);
            const { current_bid, bid_count } = aggregateResult.rows[0];
            await client.query('COMMIT');
            const io = req.app.get('io');
            if (io) {
                io.to(`lot-${lot_id}`).emit('lot-updated', {
                    lotId: lot_id,
                    currentBid: current_bid,
                    bidCount: bid_count,
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
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        console.error('Place bid error:', error);
        res.status(500).json({ error: 'Failed to place bid' });
    }
});
// Get user's bids
router.get('/my-bids', async (req, res) => {
    try {
        const user_id = req.user.id;
        const result = await database_1.pool.query(`SELECT b.*, 
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
       ORDER BY b.created_at DESC`, [user_id]);
        res.json({ bids: result.rows });
    }
    catch (error) {
        console.error('Get my bids error:', error);
        res.status(500).json({ error: 'Failed to get bids' });
    }
});
exports.default = router;
//# sourceMappingURL=bids.js.map