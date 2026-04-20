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

export async function notifyNewAuctionCreated(auction: { id: string; title: string; start_date?: string; location?: string | null; }) {
    const auctionUrl = `${frontendUrl}/pages/auction.html?id=${auction.id}`;
    const startDateText = auction.start_date ? new Date(auction.start_date).toLocaleString('en-US') : 'Soon';

    await sendAutomatedBroadcast({
        eventType: 'new_auction',
        title: `New auction: ${auction.title}`,
        message: `A new auction has been added. Starts: ${startDateText}. Location: ${auction.location || 'Online'}.`,
        url: auctionUrl
    });
}

export async function notifyAuctionFeatured(auction: { id: string; title: string; }) {
    const auctionUrl = `${frontendUrl}/pages/auction.html?id=${auction.id}`;

    await sendAutomatedBroadcast({
        eventType: 'featured_auction',
        title: `Featured auction: ${auction.title}`,
        message: 'An auction has just been featured by the admin team.',
        url: auctionUrl
    });
}

export async function notifyNewLotCreated(lot: { id: string; title: string; auction_title?: string; starting_bid?: string | number; }) {
    const lotUrl = `${frontendUrl}/pages/lot.html?id=${lot.id}`;
    const startingBid = lot.starting_bid ?? 0;

    await sendAutomatedBroadcast({
        eventType: 'new_product',
        title: `New product: ${lot.title}`,
        message: `A new product was added${lot.auction_title ? ` in ${lot.auction_title}` : ''}. Starting bid: ${startingBid}.`,
        url: lotUrl
    });
}

export async function notifyNewSubscriber(user: { fullName: string; }) {
    await sendAutomatedBroadcast({
        eventType: 'new_subscriber',
        title: 'New subscriber joined',
        message: `${user.fullName} has joined the platform.`
    });
}
