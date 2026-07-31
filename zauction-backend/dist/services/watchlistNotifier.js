"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startWatchlistNotifier = startWatchlistNotifier;
const database_1 = require("../config/database");
const whatsappBridge_1 = require("./whatsappBridge");
const whatsappMessages_1 = require("./whatsappMessages");
const isEnabled = process.env.WHATSAPP_LIVE_NOTIFICATIONS_ENABLED === 'true';
const intervalMs = Number(process.env.WHATSAPP_WATCHLIST_NOTIFICATIONS_INTERVAL_MS || 300000);
async function ensureWatchlistTables() {
    await database_1.pool.query(`
        CREATE TABLE IF NOT EXISTS watchlist_notification_state (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            lot_id UUID NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
            last_bid NUMERIC,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(user_id, lot_id)
        )
    `);
    await database_1.pool.query(`
        CREATE TABLE IF NOT EXISTS watchlist_user_notification_state (
            user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            last_template_index INT NOT NULL DEFAULT -1,
            last_sent_at TIMESTAMPTZ
        )
    `);
}
async function getWatchlistUpdates() {
    const result = await database_1.pool.query(`SELECT
            w.user_id,
            w.lot_id,
            COALESCE(l.current_bid, l.starting_bid) as current_bid,
            u.phone,
            s.last_bid,
            us.last_template_index
        FROM watchlist w
        JOIN lots l ON w.lot_id = l.id
        JOIN users u ON w.user_id = u.id
        LEFT JOIN watchlist_notification_state s
            ON s.user_id = w.user_id AND s.lot_id = w.lot_id
        LEFT JOIN watchlist_user_notification_state us
            ON us.user_id = w.user_id
        WHERE u.phone IS NOT NULL
          AND (s.last_bid IS NULL OR s.last_bid <> COALESCE(l.current_bid, l.starting_bid))
        ORDER BY w.user_id ASC`, []);
    return result.rows;
}
async function updateUserState(userId, templateIndex) {
    await database_1.pool.query(`INSERT INTO watchlist_user_notification_state (user_id, last_template_index, last_sent_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (user_id)
         DO UPDATE SET last_template_index = EXCLUDED.last_template_index, last_sent_at = EXCLUDED.last_sent_at`, [userId, templateIndex]);
}
async function updateLotState(userId, lotId, bidValue) {
    await database_1.pool.query(`INSERT INTO watchlist_notification_state (user_id, lot_id, last_bid, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_id, lot_id)
         DO UPDATE SET last_bid = EXCLUDED.last_bid, updated_at = EXCLUDED.updated_at`, [userId, lotId, bidValue]);
}
async function runWatchlistCycle() {
    try {
        await ensureWatchlistTables();
        const updates = await getWatchlistUpdates();
        if (!updates.length) {
            return;
        }
        const updatesByUser = new Map();
        for (const row of updates) {
            if (!row.phone) {
                continue;
            }
            if (!updatesByUser.has(row.user_id)) {
                updatesByUser.set(row.user_id, []);
            }
            updatesByUser.get(row.user_id).push(row);
        }
        for (const [userId, userUpdates] of updatesByUser.entries()) {
            const totalMessages = whatsappMessages_1.WHATSAPP_MESSAGES.wishlistUpdates.length;
            if (!totalMessages) {
                return;
            }
            const lastIndex = userUpdates[0].last_template_index ?? -1;
            const nextIndex = (lastIndex + 1) % totalMessages;
            const message = (0, whatsappMessages_1.getWishlistMessageByIndex)(nextIndex);
            if (!message) {
                continue;
            }
            const phone = userUpdates[0].phone || '';
            try {
                await (0, whatsappBridge_1.sendWhatsAppMessage)(phone, message);
                await updateUserState(userId, nextIndex);
                for (const update of userUpdates) {
                    const bidValue = Number(update.current_bid ?? 0);
                    await updateLotState(userId, update.lot_id, bidValue);
                }
                console.log(`📣 Watchlist update sent to user ${userId}`);
            }
            catch (error) {
                console.error(`Watchlist notification failed for user ${userId}:`, error);
            }
        }
    }
    catch (error) {
        console.error('Watchlist notifier cycle failed:', error);
    }
}
function startWatchlistNotifier() {
    if (!isEnabled || !(0, whatsappBridge_1.isWhatsAppAutomationEnabled)()) {
        console.log('ℹ️ Watchlist WhatsApp notifications are disabled');
        return;
    }
    void runWatchlistCycle();
    setInterval(() => {
        void runWatchlistCycle();
    }, intervalMs);
    console.log(`🔔 Watchlist notifier enabled (interval: ${intervalMs}ms)`);
}
//# sourceMappingURL=watchlistNotifier.js.map