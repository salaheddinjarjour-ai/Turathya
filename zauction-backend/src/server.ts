import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import adminUsersRoutes from './routes/admin/users';
import adminAuctionsRoutes from './routes/admin/auctions';
import adminCategoriesRoutes from './routes/admin/categories';
import adminLotsRoutes from './routes/admin/lots';
import adminStatsRoutes from './routes/admin/stats';
import adminWhatsAppRoutes from './routes/admin/whatsapp';
import auctionsRoutes from './routes/auctions';
import categoriesRoutes from './routes/categories';
import lotsRoutes from './routes/lots';
import bidsRoutes from './routes/bids';
import watchlistRoutes from './routes/watchlist';
import searchRoutes from './routes/search';
import shareRoutes from './routes/share';
import { initializeSocketHandlers } from './socket/handlers';
import { startLiveAuctionNotifier } from './services/liveAuctionNotifier';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);

function normalizeOrigin(url: string) {
    return url.replace(/\/+$/, '').trim();
}

const allowNetlifyPreviews = process.env.ALLOW_NETLIFY_PREVIEWS !== 'false';
const allowCfPages = process.env.ALLOW_CF_PAGES !== 'false';

// Build allowed origins from FRONTEND_URL/FRONTEND_URLS env vars + localhost defaults
const allowedOrigins = new Set<string>([
    'http://localhost:5050',
    'http://127.0.0.1:5050',
    'http://localhost:8000',
    'http://127.0.0.1:8000'
]);

if (process.env.FRONTEND_URL) {
    allowedOrigins.add(normalizeOrigin(process.env.FRONTEND_URL));
}

if (process.env.FRONTEND_URLS) {
    process.env.FRONTEND_URLS
        .split(',')
        .map((origin) => normalizeOrigin(origin))
        .filter(Boolean)
        .forEach((origin) => allowedOrigins.add(origin));
}

console.log('🔒 Allowed CORS origins:', Array.from(allowedOrigins));
console.log('🔒 Netlify preview origins allowed:', allowNetlifyPreviews);
console.log('🔒 Cloudflare Pages origins allowed:', allowCfPages);

// CORS origin checker function
const corsOriginCheck = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (server-to-server, curl, health checks)
    if (!origin) return callback(null, true);
    const normalizedOrigin = normalizeOrigin(origin);
    let isNetlifyPreview = false;
    let isCfPages = false;

    if (allowNetlifyPreviews) {
        try {
            isNetlifyPreview = /\.netlify\.app$/i.test(new URL(normalizedOrigin).hostname);
        } catch {
            isNetlifyPreview = false;
        }
    }

    if (allowCfPages) {
        try {
            isCfPages = /\.pages\.dev$/i.test(new URL(normalizedOrigin).hostname);
        } catch {
            isCfPages = false;
        }
    }

    if (allowedOrigins.has(normalizedOrigin) || isNetlifyPreview || isCfPages) {
        return callback(null, true);
    }
    console.warn(`⚠️ Blocked CORS request from origin: ${origin}`);
    return callback(null, false);
};

const corsOptions = {
    origin: corsOriginCheck,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

const io = new Server(httpServer, {
    cors: corsOptions
});

const PORT = process.env.PORT || 3000;

// Middleware — handle preflight OPTIONS first, then apply CORS
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));
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
app.use('/api/admin/categories', adminCategoriesRoutes);
app.use('/api/admin/lots', adminLotsRoutes);
app.use('/api/admin/whatsapp', adminWhatsAppRoutes);
app.use('/api/auctions', auctionsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/lots', lotsRoutes);
app.use('/api/bids', bidsRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/search', searchRoutes);

// Public share page — no CORS restriction (needed by crawlers/bots)
app.use('/share', shareRoutes);

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
