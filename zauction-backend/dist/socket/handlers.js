"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSocketHandlers = initializeSocketHandlers;
const database_1 = require("../config/database");
function initializeSocketHandlers(io) {
    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);
        // Join a lot room for real-time updates
        socket.on('join-lot', (lotId) => {
            socket.join(`lot-${lotId}`);
            console.log(`Socket ${socket.id} joined lot-${lotId}`);
        });
        // Leave a lot room
        socket.on('leave-lot', (lotId) => {
            socket.leave(`lot-${lotId}`);
            console.log(`Socket ${socket.id} left lot-${lotId}`);
        });
        // Handle new bid
        socket.on('new-bid', async (data) => {
            try {
                const { lotId, userId, amount } = data;
                // Get updated lot information
                const result = await database_1.pool.query(`SELECT l.*, 
                        (SELECT COUNT(*) FROM bids WHERE lot_id = l.id) as bid_count
                     FROM lots l
                     WHERE l.id = $1`, [lotId]);
                if (result.rows.length > 0) {
                    const lot = result.rows[0];
                    // Broadcast to all clients in this lot's room
                    io.to(`lot-${lotId}`).emit('lot-updated', {
                        lotId,
                        currentBid: lot.current_bid,
                        bidCount: lot.bid_count,
                        highestBidderId: lot.highest_bidder_id
                    });
                }
            }
            catch (error) {
                console.error('Error handling new bid:', error);
                socket.emit('bid-error', { message: 'Failed to process bid update' });
            }
        });
        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });
}
//# sourceMappingURL=handlers.js.map