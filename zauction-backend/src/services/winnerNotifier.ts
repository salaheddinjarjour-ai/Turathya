import { pool } from '../config/database';
import { isWhatsAppAutomationEnabled, sendWhatsAppMessage } from './whatsappBridge';
import { WHATSAPP_MESSAGES } from './whatsappMessages';

type WinnerRow = {
    bid_id: string;
    user_id: string;
    phone: string | null;
    lot_id: string;
    auction_id: string;
};

const isEnabled = process.env.WHATSAPP_LIVE_NOTIFICATIONS_ENABLED === 'true';
const intervalMs = Number(process.env.WHATSAPP_WINNER_NOTIFICATIONS_INTERVAL_MS || 300000);

async function ensureWinnerTable() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS auction_winner_notifications (
            bid_id UUID PRIMARY KEY REFERENCES bids(id) ON DELETE CASCADE,
            sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
}

async function getWinningBids(): Promise<WinnerRow[]> {
    const result = await pool.query(
        `SELECT DISTINCT ON (l.id)
            b.id as bid_id,
            b.user_id,
            u.phone,
            l.id as lot_id,
            a.id as auction_id
         FROM auctions a
         JOIN lots l ON l.auction_id = a.id
         JOIN bids b ON b.lot_id = l.id
         JOIN users u ON u.id = b.user_id
         LEFT JOIN auction_winner_notifications n ON n.bid_id = b.id
         WHERE a.end_date <= NOW() - INTERVAL '60 minutes'
           AND n.bid_id IS NULL
         ORDER BY l.id, b.amount DESC, b.created_at ASC`,
        []
    );

    return result.rows;
}

async function markWinnerNotified(bidId: string) {
    await pool.query(
        `INSERT INTO auction_winner_notifications (bid_id)
         VALUES ($1)
         ON CONFLICT (bid_id) DO NOTHING`,
        [bidId]
    );
}

async function runWinnerCycle() {
    try {
        await ensureWinnerTable();

        const winners = await getWinningBids();
        if (!winners.length) {
            return;
        }

        for (const winner of winners) {
            if (!winner.phone) {
                continue;
            }

            try {
                await sendWhatsAppMessage(winner.phone, WHATSAPP_MESSAGES.winner);
                await markWinnerNotified(winner.bid_id);
                console.log(`📣 Winner notification sent for bid ${winner.bid_id}`);
            } catch (error) {
                console.error(`Winner notification failed for bid ${winner.bid_id}:`, error);
            }
        }
    } catch (error) {
        console.error('Winner notifier cycle failed:', error);
    }
}

export function startWinnerNotifier() {
    if (!isEnabled || !isWhatsAppAutomationEnabled()) {
        console.log('ℹ️ Winner WhatsApp notifications are disabled');
        return;
    }

    void runWinnerCycle();
    setInterval(() => {
        void runWinnerCycle();
    }, intervalMs);

    console.log(`🔔 Winner notifier enabled (interval: ${intervalMs}ms)`);
}
