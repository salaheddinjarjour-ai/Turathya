"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startLiveAuctionNotifier = startLiveAuctionNotifier;
const database_1 = require("../config/database");
const bridgeUrl = (process.env.WHATSAPP_BRIDGE_URL || 'http://localhost:3001').replace(/\/$/, '');
const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:8000').replace(/\/$/, '');
const isEnabled = process.env.WHATSAPP_LIVE_NOTIFICATIONS_ENABLED === 'true';
const intervalMs = Number(process.env.WHATSAPP_LIVE_NOTIFICATIONS_INTERVAL_MS || 60000);
let notifierTimer = null;
async function ensureNotificationTable() {
    await database_1.pool.query(`
        CREATE TABLE IF NOT EXISTS live_auction_notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            auction_id UUID UNIQUE NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
            sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
}
async function syncAuctionStatuses() {
    await database_1.pool.query(`
        UPDATE auctions
        SET status = 'active', updated_at = NOW()
        WHERE status = 'upcoming'
          AND start_date <= NOW()
          AND end_date > NOW()
    `);
    await database_1.pool.query(`
        UPDATE auctions
        SET status = 'ended', updated_at = NOW()
        WHERE status <> 'ended'
          AND end_date <= NOW()
    `);
}
async function getAuctionsToNotify() {
    const result = await database_1.pool.query(`
        SELECT
            a.id,
            a.title,
            a.location,
            a.start_date,
            (SELECT MIN(l.starting_bid) FROM lots l WHERE l.auction_id = a.id) AS min_starting_bid
        FROM auctions a
        LEFT JOIN live_auction_notifications n ON n.auction_id = a.id
        WHERE a.status = 'active'
          AND a.start_date <= NOW()
          AND a.end_date > NOW()
          AND n.auction_id IS NULL
        ORDER BY a.start_date ASC
    `);
    return result.rows;
}
async function sendLiveNotification(auction) {
    const payload = {
        auctionId: auction.id,
        title: `🔴 LIVE NOW: ${auction.title}`,
        startingPrice: Number(auction.min_starting_bid || 0),
        startTime: new Date(auction.start_date).toLocaleString('en-US'),
        location: auction.location || 'Online',
        url: `${frontendUrl}/pages/auction.html?id=${auction.id}`
    };
    const response = await fetch(`${bridgeUrl}/api/auctions/notify`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        let message = `Live notification failed (${response.status})`;
        try {
            const errorPayload = await response.json();
            message = errorPayload.error || errorPayload.message || message;
        }
        catch {
            const text = await response.text();
            if (text) {
                message = text;
            }
        }
        throw new Error(message);
    }
}
async function markAuctionNotified(auctionId) {
    await database_1.pool.query(`INSERT INTO live_auction_notifications (auction_id) VALUES ($1) ON CONFLICT (auction_id) DO NOTHING`, [auctionId]);
}
async function runNotifierCycle() {
    try {
        await ensureNotificationTable();
        await syncAuctionStatuses();
        const auctions = await getAuctionsToNotify();
        for (const auction of auctions) {
            try {
                await sendLiveNotification(auction);
                await markAuctionNotified(auction.id);
                console.log(`📣 Live notification sent for auction ${auction.id}`);
            }
            catch (error) {
                console.error(`Live notification failed for auction ${auction.id}:`, error);
            }
        }
    }
    catch (error) {
        console.error('Live auction notifier cycle failed:', error);
    }
}
function startLiveAuctionNotifier() {
    if (!isEnabled) {
        console.log('ℹ️ Live auction WhatsApp notifications are disabled');
        return;
    }
    if (notifierTimer) {
        clearInterval(notifierTimer);
    }
    void runNotifierCycle();
    notifierTimer = setInterval(() => {
        void runNotifierCycle();
    }, intervalMs);
    console.log(`🔔 Live auction notifier enabled (interval: ${intervalMs}ms)`);
}
//# sourceMappingURL=liveAuctionNotifier.js.map