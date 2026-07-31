import { Server, Socket } from 'socket.io';

export function initializeSocketHandlers(io: Server) {
    io.on('connection', (socket: Socket) => {
        console.log('Client connected:', socket.id);

        // Join a lot room for real-time updates
        socket.on('join-lot', (lotId: string) => {
            socket.join(`lot-${lotId}`);
            console.log(`Socket ${socket.id} joined lot-${lotId}`);
        });

        // Leave a lot room
        socket.on('leave-lot', (lotId: string) => {
            socket.leave(`lot-${lotId}`);
            console.log(`Socket ${socket.id} left lot-${lotId}`);
        });

        // NOTE: there is deliberately no client-triggered 'new-bid' handler here.
        // Socket connections are unauthenticated (lot rooms carry public data
        // only), so an inbound event was a free way for any anonymous client to
        // make the server fan out a broadcast. The authoritative broadcast is
        // emitted by POST /api/bids once the bid transaction commits.

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });
}
