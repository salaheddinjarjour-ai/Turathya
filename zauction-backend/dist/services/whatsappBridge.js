"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isWhatsAppAutomationEnabled = isWhatsAppAutomationEnabled;
exports.getWhatsAppBridgeStatus = getWhatsAppBridgeStatus;
exports.getWhatsAppBridgeQr = getWhatsAppBridgeQr;
exports.syncSubscriberToWhatsApp = syncSubscriberToWhatsApp;
exports.sendAutomatedBroadcast = sendAutomatedBroadcast;
exports.broadcastWhatsAppMessage = broadcastWhatsAppMessage;
exports.sendWhatsAppMessage = sendWhatsAppMessage;
exports.notifyNewAuctionCreated = notifyNewAuctionCreated;
exports.notifyAuctionFeatured = notifyAuctionFeatured;
exports.notifyNewLotCreated = notifyNewLotCreated;
exports.notifyNewSubscriber = notifyNewSubscriber;
const prisma_1 = require("../config/prisma");
const whatsappMessages_1 = require("./whatsappMessages");
const bridgeUrl = (process.env.WHATSAPP_BRIDGE_URL || 'http://localhost:3001').replace(/\/$/, '');
const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:8000').replace(/\/$/, '');
const automationEnabled = process.env.WHATSAPP_AUTOMATION_ENABLED !== 'false';
async function parseErrorResponse(response) {
    const fallback = `WhatsApp bridge request failed (${response.status})`;
    try {
        const payload = await response.json();
        return payload.error || payload.message || fallback;
    }
    catch {
        try {
            const text = await response.text();
            return text || fallback;
        }
        catch {
            return fallback;
        }
    }
}
async function bridgeGet(path) {
    const response = await fetch(`${bridgeUrl}${path}`);
    if (!response.ok) {
        throw new Error(await parseErrorResponse(response));
    }
    return response.json();
}
async function bridgePost(path, body) {
    const response = await fetch(`${bridgeUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!response.ok) {
        throw new Error(await parseErrorResponse(response));
    }
    return response.json();
}
function normalizePhone(phone) {
    return (phone || '').replace(/\D/g, '');
}
function isWhatsAppAutomationEnabled() {
    return automationEnabled;
}
async function getWhatsAppBridgeStatus() {
    return bridgeGet('/api/whatsapp/status');
}
async function getWhatsAppBridgeQr() {
    return bridgeGet('/api/whatsapp/qr');
}
async function syncSubscriberToWhatsApp(phone, fullName) {
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
        return;
    }
    await bridgePost('/api/users/subscribe', {
        phoneNumber: normalizedPhone,
        fullName: fullName || null
    });
}
async function sendAutomatedBroadcast(payload) {
    if (!automationEnabled) {
        return;
    }
    await bridgePost('/api/events/broadcast', payload);
}
async function broadcastWhatsAppMessage(message) {
    if (!automationEnabled) {
        return;
    }
    if (!String(message).trim()) {
        return;
    }
    const payload = {
        message: String(message)
    };
    await bridgePost('/api/messages/broadcast', payload);
}
async function sendWhatsAppMessage(phone, message) {
    if (!automationEnabled) {
        return;
    }
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone || !String(message).trim()) {
        return;
    }
    const payload = {
        phoneNumber: normalizedPhone,
        message: String(message)
    };
    await bridgePost('/api/messages/send', payload);
}
async function notifyNewAuctionCreated(auction) {
    const auctionUrl = `${frontendUrl}/pages/auction.html?id=${auction.id}`;
    const message = `${whatsappMessages_1.WHATSAPP_MESSAGES.collectionLaunch}\n🔗 ${auctionUrl}`;
    await broadcastWhatsAppMessage(message);
}
async function notifyAuctionFeatured(auction) {
    const auctionUrl = `${frontendUrl}/pages/auction.html?id=${auction.id}`;
    const message = `${whatsappMessages_1.WHATSAPP_MESSAGES.featuredAuctionOneHour}\n🔗 ${auctionUrl}`;
    await broadcastWhatsAppMessage(message);
}
async function notifyNewLotCreated(lot) {
    const lotUrl = `${frontendUrl}/pages/lot.html?id=${lot.id}`;
    const startingBid = Number(lot.starting_bid ?? 0).toFixed(2);
    const auctionPart = lot.auction_title ? `\nالمجموعة: ${lot.auction_title}` : '';
    const message = `🔔 منتج جديد في المزاد\n${lot.title}${auctionPart}\nالسعر الابتدائي: $${startingBid}\n🔗 ${lotUrl}`;
    await broadcastWhatsAppMessage(message);
}
async function notifyNewSubscriber(user) {
    // Fetch all admin users that have a phone number registered
    const admins = await prisma_1.prisma.user.findMany({
        where: { role: 'admin', phone: { not: null } },
        select: { phone: true }
    });
    if (admins.length === 0) {
        return;
    }
    const message = `🔔 مشترك جديد: *${user.fullName}* انضم إلى المنصة للتو.`;
    // Send a direct message to each admin — not a broadcast to all users
    await Promise.allSettled(admins
        .filter(a => a.phone)
        .map(a => sendWhatsAppMessage(a.phone, message)));
}
//# sourceMappingURL=whatsappBridge.js.map