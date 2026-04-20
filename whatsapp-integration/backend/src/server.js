import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import whatsappService from './whatsapp.service.js';
import dbService from './database.service.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3002',
    process.env.FRONTEND_URL
].filter(Boolean);

// Middleware
app.use(cors({
    origin(origin, callback) {
        // Allow non-browser requests (curl/Postman) and allowed local frontends.
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error(`CORS blocked for origin: ${origin}`));
    }
}));
app.use(express.json());

// Initialize WhatsApp on server start
whatsappService.initialize().catch(console.error);

// ============================================
// AUTHENTICATION ENDPOINTS
// ============================================

/**
 * GET /api/whatsapp/qr
 * Get QR code for WhatsApp connection
 */
app.get('/api/whatsapp/qr', (req, res) => {
    const qrCode = whatsappService.getQRCode();
    const status = whatsappService.getConnectionStatus();

    res.json({
        qrCode,
        ...status
    });
});

app.get('/api/whatsapp/qr-image', (req, res) => {
        const qrCode = whatsappService.getQRCode();

        if (!qrCode) {
                return res.status(404).json({
                        error: 'QR code not available yet',
                        message: 'Wait a few seconds and refresh this endpoint.'
                });
        }

        const base64Data = qrCode.replace(/^data:image\/png;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');

        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'no-store');
        res.send(imageBuffer);
});

app.get('/api/whatsapp/qr-view', (req, res) => {
        const status = whatsappService.getConnectionStatus();
        if (status.isConnected) {
                return res.send('<h2>WhatsApp is already connected ✅</h2>');
        }

        res.send(`<!doctype html>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>WhatsApp QR</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; min-height: 100vh; display: grid; place-items: center; background: #111; color: #fff; }
        .wrap { text-align: center; }
        img { width: 320px; height: 320px; background: #fff; padding: 12px; border-radius: 12px; }
        p { opacity: .85; }
    </style>
</head>
<body>
    <div class="wrap">
        <h2>Scan with WhatsApp Linked Devices</h2>
        <img src="/api/whatsapp/qr-image?t=${Date.now()}" alt="WhatsApp QR Code" />
        <p>If it expires, refresh this page.</p>
    </div>
</body>
</html>`);
});

/**
 * GET /api/whatsapp/status
 * Check WhatsApp connection status
 */
app.get('/api/whatsapp/status', (req, res) => {
    const status = whatsappService.getConnectionStatus();
    res.json(status);
});

/**
 * POST /api/auth/send-otp
 * Send OTP to phone number for verification
 * Body: { phoneNumber: "1234567890" }
 */
app.post('/api/auth/send-otp', async (req, res) => {
    try {
        const { phoneNumber } = req.body;

        if (!phoneNumber) {
            return res.status(400).json({ error: 'Phone number is required' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Save OTP to database
        dbService.saveOTP(phoneNumber, otp);

        // Send OTP via WhatsApp
        await whatsappService.sendOTP(phoneNumber, otp);

        res.json({
            success: true,
            message: 'OTP sent successfully',
            // In production, don't send OTP in response!
            // This is only for testing
            debug: process.env.NODE_ENV === 'development' ? { otp } : undefined
        });
    } catch (error) {
        console.error('Send OTP error:', error);
        res.status(500).json({
            error: 'Failed to send OTP',
            message: error.message
        });
    }
});

/**
 * POST /api/auth/send-otp-direct
 * Send provided OTP to phone number (for external backend integration)
 * Body: { phoneNumber: "1234567890", otp: "123456" }
 */
app.post('/api/auth/send-otp-direct', async (req, res) => {
    try {
        const { phoneNumber, otp } = req.body;

        if (!phoneNumber || !otp) {
            return res.status(400).json({ error: 'Phone number and OTP are required' });
        }

        dbService.saveOTP(phoneNumber, otp);
        await whatsappService.sendOTP(phoneNumber, otp);
        dbService.createUser(phoneNumber);

        res.json({
            success: true,
            message: 'OTP sent successfully'
        });
    } catch (error) {
        console.error('Send direct OTP error:', error);
        res.status(500).json({
            error: 'Failed to send OTP',
            message: error.message
        });
    }
});

/**
 * POST /api/auth/verify-otp
 * Verify OTP and create/verify user
 * Body: { phoneNumber: "1234567890", otp: "123456" }
 */
app.post('/api/auth/verify-otp', async (req, res) => {
    try {
        const { phoneNumber, otp } = req.body;

        if (!phoneNumber || !otp) {
            return res.status(400).json({ error: 'Phone number and OTP are required' });
        }

        // Verify OTP
        const isValid = dbService.verifyOTP(phoneNumber, otp);

        if (!isValid) {
            return res.status(401).json({
                error: 'Invalid or expired OTP'
            });
        }

        // Create or update user
        dbService.createUser(phoneNumber);

        res.json({
            success: true,
            message: 'Phone number verified successfully',
            user: dbService.getUserByPhone(phoneNumber)
        });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({
            error: 'Failed to verify OTP',
            message: error.message
        });
    }
});

/**
 * POST /api/users/subscribe
 * Upsert a user into WhatsApp notifications audience
 * Body: { phoneNumber: "1234567890", fullName?: "Name" }
 */
app.post('/api/users/subscribe', (req, res) => {
    try {
        const { phoneNumber } = req.body;

        if (!phoneNumber) {
            return res.status(400).json({ error: 'Phone number is required' });
        }

        const normalizedPhone = String(phoneNumber).replace(/\D/g, '');
        if (!normalizedPhone) {
            return res.status(400).json({ error: 'Phone number is invalid' });
        }

        const user = dbService.createUser(normalizedPhone);
        res.json({ success: true, user });
    } catch (error) {
        console.error('Subscribe user error:', error);
        res.status(500).json({ error: 'Failed to subscribe user', message: error.message });
    }
});

/**
 * POST /api/events/broadcast
 * Send a generic automated event notification to all opted-in users
 * Body: { eventType, title, message, url? }
 */
app.post('/api/events/broadcast', async (req, res) => {
    try {
        const { eventType = 'general', title, message, url } = req.body;

        if (!title || !message) {
            return res.status(400).json({ error: 'Title and message are required' });
        }

        const users = dbService.getAllOptedInUsers();
        if (users.length === 0) {
            return res.json({
                success: true,
                message: 'No users to notify',
                sent: 0,
                eventType
            });
        }

        const text = `🔔 *${title}*\n\n${message}${url ? `\n\n🔗 ${url}` : ''}`;

        const results = [];
        for (const user of users) {
            try {
                await whatsappService.sendTextMessage(user.phone_number, text);
                results.push({ phoneNumber: user.phone_number, success: true });
                await new Promise((resolve) => setTimeout(resolve, 1000));
            } catch (error) {
                results.push({ phoneNumber: user.phone_number, success: false, error: error.message });
            }
        }

        const sent = results.filter((r) => r.success).length;

        res.json({
            success: true,
            message: `Event broadcast sent to ${sent}/${users.length} users`,
            eventType,
            sent,
            total: users.length,
            results
        });
    } catch (error) {
        console.error('Broadcast event error:', error);
        res.status(500).json({ error: 'Failed to broadcast event', message: error.message });
    }
});

// ============================================
// AUCTION NOTIFICATION ENDPOINTS
// ============================================

/**
 * POST /api/auctions/notify
 * Send auction notification to all opted-in users
 * Body: { 
 *   auctionId: 1,
 *   title: "Vintage Car",
 *   startingPrice: 5000,
 *   startTime: "2026-02-15 10:00",
 *   location: "Online",
 *   url: "https://example.com/auction/1"
 * }
 */
app.post('/api/auctions/notify', async (req, res) => {
    try {
        const auctionData = req.body;

        if (!auctionData.title) {
            return res.status(400).json({ error: 'Auction title is required' });
        }

        if (auctionData.startingPrice !== undefined && auctionData.startingPrice !== null) {
            const parsedPrice = Number(auctionData.startingPrice);
            if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
                return res.status(400).json({ error: 'Starting price must be a valid non-negative number' });
            }
            auctionData.startingPrice = parsedPrice;
        }

        // Get all opted-in users
        const users = dbService.getAllOptedInUsers();
        const phoneNumbers = users.map(u => u.phone_number);

        if (phoneNumbers.length === 0) {
            return res.json({
                success: true,
                message: 'No users to notify',
                sent: 0
            });
        }

        // Send bulk notifications
        const results = await whatsappService.sendBulkNotifications(phoneNumbers, auctionData);

        // Log notifications
        results.forEach(result => {
            const status = result.success ? 'sent' : 'failed';
            dbService.logNotification(result.phoneNumber, auctionData.auctionId, status);
        });

        const successCount = results.filter(r => r.success).length;

        res.json({
            success: true,
            message: `Notifications sent to ${successCount}/${phoneNumbers.length} users`,
            sent: successCount,
            total: phoneNumbers.length,
            results
        });
    } catch (error) {
        console.error('Notify auction error:', error);
        res.status(500).json({
            error: 'Failed to send notifications',
            message: error.message
        });
    }
});

/**
 * POST /api/auctions/notify-single
 * Send auction notification to a single user
 * Body: { phoneNumber: "1234567890", ...auctionData }
 */
app.post('/api/auctions/notify-single', async (req, res) => {
    try {
        const { phoneNumber, ...auctionData } = req.body;

        if (!phoneNumber) {
            return res.status(400).json({ error: 'Phone number is required' });
        }

        await whatsappService.sendAuctionNotification(phoneNumber, auctionData);

        dbService.logNotification(phoneNumber, auctionData.auctionId, 'sent');

        res.json({
            success: true,
            message: 'Notification sent successfully'
        });
    } catch (error) {
        console.error('Notify single user error:', error);
        res.status(500).json({
            error: 'Failed to send notification',
            message: error.message
        });
    }
});

/**
 * GET /api/auctions/:id/stats
 * Get notification statistics for an auction
 */
app.get('/api/auctions/:id/stats', (req, res) => {
    try {
        const { id } = req.params;
        const stats = dbService.getNotificationStats(id);

        res.json({
            auctionId: id,
            stats
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            error: 'Failed to get statistics',
            message: error.message
        });
    }
});

// ============================================
// USER MANAGEMENT ENDPOINTS
// ============================================

/**
 * GET /api/users
 * Get all users
 */
app.get('/api/users', (req, res) => {
    try {
        const users = dbService.getAllOptedInUsers();
        res.json({ users });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            error: 'Failed to get users',
            message: error.message
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        whatsapp: whatsappService.getConnectionStatus()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🎉 FREE WhatsApp API Server Running!               ║
║                                                       ║
║   📡 Server: http://localhost:${PORT}                    ║
║   💰 Cost: $0 (Completely FREE!)                     ║
║   📚 Library: Baileys (Open Source)                  ║
║                                                       ║
║   🔗 Endpoints:                                       ║
║   - GET  /api/whatsapp/qr                            ║
║   - POST /api/auth/send-otp                          ║
║   - POST /api/auth/verify-otp                        ║
║   - POST /api/auctions/notify                        ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);
});

export default app;
