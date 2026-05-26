import { prisma } from '../config/prisma';
import { WHATSAPP_MESSAGES } from './whatsappMessages';

type WhatsAppBridgeStatus = {
    isConnected: boolean;
    hasQRCode: boolean;
    connectedJid: string | null;
};

type WhatsAppBridgeQrResponse = WhatsAppBridgeStatus & {
    qrCode: string | null;
};

type BroadcastPayload = {
    eventType: string;
    title: string;
    message: string;
    url?: string;
};

type MessagePayload = {
    message: string;
};

type SingleMessagePayload = MessagePayload & {
    phoneNumber: string;
};

const bridgeUrl = (process.env.WHATSAPP_BRIDGE_URL || 'http://localhost:3001').replace(/\/$/, '');
const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:8000').replace(/\/$/, '');
const automationEnabled = process.env.WHATSAPP_AUTOMATION_ENABLED !== 'false';

async function parseErrorResponse(response: Response): Promise<string> {
    const fallback = `WhatsApp bridge request failed (${response.status})`;

    try {
        const payload = await response.json() as { error?: string; message?: string };
        return payload.error || payload.message || fallback;
    } catch {
        try {
            const text = await response.text();
            return text || fallback;
        } catch {
            return fallback;
        }
    }
}

async function bridgeGet<T>(path: string): Promise<T> {
    const response = await fetch(`${bridgeUrl}${path}`);
    if (!response.ok) {
        throw new Error(await parseErrorResponse(response));
    }
    return response.json() as Promise<T>;
}

async function bridgePost<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${bridgeUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        throw new Error(await parseErrorResponse(response));
    }

    return response.json() as Promise<T>;
}

function normalizePhone(phone: string) {
    return (phone || '').replace(/\D/g, '');
}

export function isWhatsAppAutomationEnabled() {
    return automationEnabled;
}

export async function getWhatsAppBridgeStatus(): Promise<WhatsAppBridgeStatus> {
    return bridgeGet<WhatsAppBridgeStatus>('/api/whatsapp/status');
}

export async function getWhatsAppBridgeQr(): Promise<WhatsAppBridgeQrResponse> {
    return bridgeGet<WhatsAppBridgeQrResponse>('/api/whatsapp/qr');
}

export async function syncSubscriberToWhatsApp(phone: string, fullName?: string) {
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
        return;
    }

    await bridgePost('/api/users/subscribe', {
        phoneNumber: normalizedPhone,
        fullName: fullName || null
    });
}

export async function sendAutomatedBroadcast(payload: BroadcastPayload) {
    if (!automationEnabled) {
        return;
    }

    await bridgePost('/api/events/broadcast', payload);
}

export async function broadcastWhatsAppMessage(message: string) {
    if (!automationEnabled) {
        return;
    }

    if (!String(message).trim()) {
        return;
    }

    const payload: MessagePayload = {
        message: String(message)
    };

    await bridgePost('/api/messages/broadcast', payload);
}

export async function sendWhatsAppMessage(phone: string, message: string) {
    if (!automationEnabled) {
        return;
    }

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone || !String(message).trim()) {
        return;
    }

    const payload: SingleMessagePayload = {
        phoneNumber: normalizedPhone,
        message: String(message)
    };

    await bridgePost('/api/messages/send', payload);
}

export async function notifyNewAuctionCreated(auction: { id: string; title: string; start_date?: string; location?: string | null; }) {
    const auctionUrl = `${frontendUrl}/pages/auction.html?id=${auction.id}`;
    const message = `${WHATSAPP_MESSAGES.collectionLaunch}\n🔗 ${auctionUrl}`;
    await broadcastWhatsAppMessage(message);
}

export async function notifyAuctionFeatured(auction: { id: string; title: string; }) {
    const auctionUrl = `${frontendUrl}/pages/auction.html?id=${auction.id}`;
    const message = `${WHATSAPP_MESSAGES.featuredAuctionOneHour}\n🔗 ${auctionUrl}`;
    await broadcastWhatsAppMessage(message);
}

export async function notifyNewLotCreated(lot: { id: string; title: string; auction_title?: string; starting_bid?: string | number; }) {
    const lotUrl = `${frontendUrl}/pages/lot.html?id=${lot.id}`;
    const startingBid = Number(lot.starting_bid ?? 0).toFixed(2);
    const auctionPart = lot.auction_title ? `\nالمجموعة: ${lot.auction_title}` : '';
    const message = `🔔 منتج جديد في المزاد\n${lot.title}${auctionPart}\nالسعر الابتدائي: $${startingBid}\n🔗 ${lotUrl}`;
    await broadcastWhatsAppMessage(message);
}

export async function notifyNewSubscriber(user: { fullName: string; }) {
    // Fetch all admin users that have a phone number registered
    const admins = await prisma.user.findMany({
        where: { role: 'admin', phone: { not: null } },
        select: { phone: true }
    });

    if (admins.length === 0) {
        return;
    }

    const message = `🔔 مشترك جديد: *${user.fullName}* انضم إلى المنصة للتو.`;

    // Send a direct message to each admin — not a broadcast to all users
    await Promise.allSettled(
        admins
            .filter(a => a.phone)
            .map(a => sendWhatsAppMessage(a.phone!, message))
    );
}
