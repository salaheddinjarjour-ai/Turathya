import { Router, Response } from 'express';
import { authenticate, requireAdmin, AuthRequest } from '../../middleware/auth';
import { getWhatsAppBridgeQr, getWhatsAppBridgeStatus } from '../../services/whatsappBridge';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/status', async (_req: AuthRequest, res: Response) => {
    try {
        const status = await getWhatsAppBridgeStatus();
        res.json(status);
    } catch (error: any) {
        console.error('WhatsApp status proxy error:', error);
        res.status(502).json({ error: error.message || 'Failed to fetch WhatsApp status' });
    }
});

router.get('/qr', async (_req: AuthRequest, res: Response) => {
    try {
        const qr = await getWhatsAppBridgeQr();
        res.json(qr);
    } catch (error: any) {
        console.error('WhatsApp QR proxy error:', error);
        res.status(502).json({ error: error.message || 'Failed to fetch WhatsApp QR' });
    }
});

export default router;
