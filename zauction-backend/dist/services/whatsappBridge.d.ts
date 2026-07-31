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
export declare function isWhatsAppAutomationEnabled(): boolean;
export declare function getWhatsAppBridgeStatus(): Promise<WhatsAppBridgeStatus>;
export declare function getWhatsAppBridgeQr(): Promise<WhatsAppBridgeQrResponse>;
export declare function syncSubscriberToWhatsApp(phone: string, fullName?: string): Promise<void>;
export declare function sendAutomatedBroadcast(payload: BroadcastPayload): Promise<void>;
export declare function broadcastWhatsAppMessage(message: string): Promise<void>;
export declare function sendWhatsAppMessage(phone: string, message: string): Promise<void>;
export declare function notifyNewAuctionCreated(auction: {
    id: string;
    title: string;
    start_date?: string;
    location?: string | null;
}): Promise<void>;
export declare function notifyAuctionFeatured(auction: {
    id: string;
    title: string;
}): Promise<void>;
export declare function notifyNewLotCreated(lot: {
    id: string;
    title: string;
    auction_title?: string;
    starting_bid?: string | number;
}): Promise<void>;
export declare function notifyNewSubscriber(user: {
    fullName: string;
}): Promise<void>;
export {};
//# sourceMappingURL=whatsappBridge.d.ts.map