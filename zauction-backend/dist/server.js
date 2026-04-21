"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/admin/users"));
const auctions_1 = __importDefault(require("./routes/admin/auctions"));
const categories_1 = __importDefault(require("./routes/admin/categories"));
const lots_1 = __importDefault(require("./routes/admin/lots"));
const stats_1 = __importDefault(require("./routes/admin/stats"));
const whatsapp_1 = __importDefault(require("./routes/admin/whatsapp"));
const auctions_2 = __importDefault(require("./routes/auctions"));
const categories_2 = __importDefault(require("./routes/categories"));
const lots_2 = __importDefault(require("./routes/lots"));
const bids_1 = __importDefault(require("./routes/bids"));
const watchlist_1 = __importDefault(require("./routes/watchlist"));
const search_1 = __importDefault(require("./routes/search"));
const handlers_1 = require("./socket/handlers");
const liveAuctionNotifier_1 = require("./services/liveAuctionNotifier");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
function normalizeOrigin(url) {
    return url.replace(/\/+$/, '').trim();
}
const allowNetlifyPreviews = process.env.ALLOW_NETLIFY_PREVIEWS !== 'false';
// Build allowed origins from FRONTEND_URL/FRONTEND_URLS env vars + localhost defaults
const allowedOrigins = new Set([
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
// CORS origin checker function
const corsOriginCheck = (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl, health checks)
    if (!origin)
        return callback(null, true);
    const normalizedOrigin = normalizeOrigin(origin);
    let isNetlifyPreview = false;
    if (allowNetlifyPreviews) {
        try {
            isNetlifyPreview = /\.netlify\.app$/i.test(new URL(normalizedOrigin).hostname);
        }
        catch {
            isNetlifyPreview = false;
        }
    }
    if (allowedOrigins.has(normalizedOrigin) || isNetlifyPreview) {
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
const io = new socket_io_1.Server(httpServer, {
    cors: corsOptions
});
exports.io = io;
const PORT = process.env.PORT || 3000;
// Middleware — handle preflight OPTIONS first, then apply CORS
app.options('*', (0, cors_1.default)(corsOptions));
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
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
app.use('/api/auth', auth_1.default);
app.use('/api/admin/stats', stats_1.default);
app.use('/api/admin/users', users_1.default);
app.use('/api/admin/auctions', auctions_1.default);
app.use('/api/admin/categories', categories_1.default);
app.use('/api/admin/lots', lots_1.default);
app.use('/api/admin/whatsapp', whatsapp_1.default);
app.use('/api/auctions', auctions_2.default);
app.use('/api/categories', categories_2.default);
app.use('/api/lots', lots_2.default);
app.use('/api/bids', bids_1.default);
app.use('/api/watchlist', watchlist_1.default);
app.use('/api/search', search_1.default);
// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error'
    });
});
// Initialize Socket.IO handlers
(0, handlers_1.initializeSocketHandlers)(io);
// Initialize live auction notification scheduler
(0, liveAuctionNotifier_1.startLiveAuctionNotifier)();
// Start server
httpServer.listen(PORT, () => {
    console.log(`🚀 Zauction Backend Server running on port ${PORT}`);
    console.log(`📡 WebSocket server ready for live bidding`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 API: http://localhost:${PORT}/api`);
    console.log(`💚 Health: http://localhost:${PORT}/health`);
});
exports.default = app;
//# sourceMappingURL=server.js.map