import { pool } from '../config/database';
import { broadcastWhatsAppMessage, isWhatsAppAutomationEnabled } from './whatsappBridge';
import { WHATSAPP_MESSAGES } from './whatsappMessages';

const isEnabled = process.env.WHATSAPP_LIVE_NOTIFICATIONS_ENABLED === 'true';
const intervalMs = Number(process.env.WHATSAPP_AUCTION_FOLLOWUP_INTERVAL_MS || 300000);

const FOLLOWUP_MINUTES = 60;

async function ensureFollowupTable() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS auction_followup_notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
            notification_type TEXT NOT NULL,
            sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(auction_id, notification_type)
        )
    `);
}

async function getAuctionsForFollowup(notificationType: string, featured: boolean) {
    const result = await pool.query(
        `SELECT a.id
         FROM auctions a
         LEFT JOIN auction_followup_notifications n
           ON n.auction_id = a.id AND n.notification_type = $1
         WHERE a.start_date <= NOW() - INTERVAL '60 minutes'
           AND a.end_date > NOW()
           AND COALESCE(a.featured, FALSE) = $2
           AND n.auction_id IS NULL
         ORDER BY a.start_date ASC`,
        [notificationType, featured]
    );

    return result.rows as Array<{ id: string }>;
}

async function markFollowupSent(auctionId: string, notificationType: string) {
    await pool.query(
        `INSERT INTO auction_followup_notifications (auction_id, notification_type)
         VALUES ($1, $2)
         ON CONFLICT (auction_id, notification_type) DO NOTHING`,
        [auctionId, notificationType]
    );
}

async function runFollowupCycle() {
    try {
        await ensureFollowupTable();

        const normalType = 'normal_one_hour';
        const featuredType = 'featured_one_hour';

        const normalAuctions = await getAuctionsForFollowup(normalType, false);
        for (const auction of normalAuctions) {
            try {
                await broadcastWhatsAppMessage(WHATSAPP_MESSAGES.normalAuctionOneHour);
                await markFollowupSent(auction.id, normalType);
                console.log(`📣 Follow-up notification sent for normal auction ${auction.id}`);
            } catch (error) {
                console.error(`Follow-up notification failed for normal auction ${auction.id}:`, error);
            }
        }

        const featuredAuctions = await getAuctionsForFollowup(featuredType, true);
        for (const auction of featuredAuctions) {
            try {
                await broadcastWhatsAppMessage(WHATSAPP_MESSAGES.featuredAuctionOneHour);
                await markFollowupSent(auction.id, featuredType);
                console.log(`📣 Follow-up notification sent for featured auction ${auction.id}`);
            } catch (error) {
                console.error(`Follow-up notification failed for featured auction ${auction.id}:`, error);
            }
        }
    } catch (error) {
        console.error('Auction follow-up notifier cycle failed:', error);
    }
}

export function startAuctionLaunchFollowupNotifier() {
    if (!isEnabled || !isWhatsAppAutomationEnabled()) {
        console.log('ℹ️ Auction follow-up WhatsApp notifications are disabled');
        return;
    }

    void runFollowupCycle();
    setInterval(() => {
        void runFollowupCycle();
    }, intervalMs);

    console.log(`🔔 Auction follow-up notifier enabled (interval: ${intervalMs}ms, delay: ${FOLLOWUP_MINUTES}m)`);
}
