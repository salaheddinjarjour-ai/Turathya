import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import adminUsersRoutes from './routes/admin/users';
import adminAuctionsRoutes from './routes/admin/auctions';
import adminLotsRoutes from './routes/admin/lots';
import adminStatsRoutes from './routes/admin/stats';
import auctionsRoutes from './routes/auctions';
import lotsRoutes from './routes/lots';
import bidsRoutes from './routes/bids';
import watchlistRoutes from './routes/watchlist';
import searchRoutes from './routes/search';
import { initializeSocketHandlers } from './socket/handlers';
import { startLiveAuctionNotifier } from './services/liveAuctionNotifier';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);

// Build allowed origins from FRONTEND_URL env var + localhost defaults
const allowedOrigins = ['http://localhost:8000', 'http://127.0.0.1:8000'];
if (process.env.FRONTEND_URL) {
    allowedOrigins.unshift(process.env.FRONTEND_URL);
}

const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true
    }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Make io accessible to routes
app.set('io', io);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin/stats', adminStatsRoutes);
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/admin/auctions', adminAuctionsRoutes);
app.use('/api/admin/lots', adminLotsRoutes);
app.use('/api/auctions', auctionsRoutes);
app.use('/api/lots', lotsRoutes);
app.use('/api/bids', bidsRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/search', searchRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error'
    });
});

// Initialize Socket.IO handlers
initializeSocketHandlers(io);

// Initialize live auction notification scheduler
startLiveAuctionNotifier();

// Start server
httpServer.listen(PORT, () => {
    console.log(`🚀 Zauction Backend Server running on port ${PORT}`);
    console.log(`📡 WebSocket server ready for live bidding`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 API: http://localhost:${PORT}/api`);
    console.log(`💚 Health: http://localhost:${PORT}/health`);
});

export { io };
export default app;
