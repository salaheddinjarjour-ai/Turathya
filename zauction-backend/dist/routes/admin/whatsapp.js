"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const whatsappBridge_1 = require("../../services/whatsappBridge");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate, auth_1.requireAdmin);
router.get('/status', async (_req, res) => {
    try {
        const status = await (0, whatsappBridge_1.getWhatsAppBridgeStatus)();
        res.json(status);
    }
    catch (error) {
        console.error('WhatsApp status proxy error:', error);
        res.status(502).json({ error: error.message || 'Failed to fetch WhatsApp status' });
    }
});
router.get('/qr', async (_req, res) => {
    try {
        const qr = await (0, whatsappBridge_1.getWhatsAppBridgeQr)();
        res.json(qr);
    }
    catch (error) {
        console.error('WhatsApp QR proxy error:', error);
        res.status(502).json({ error: error.message || 'Failed to fetch WhatsApp QR' });
    }
});
exports.default = router;
//# sourceMappingURL=whatsapp.js.map