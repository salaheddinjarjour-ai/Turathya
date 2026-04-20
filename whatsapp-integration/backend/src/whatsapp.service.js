import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import QRCode from 'qrcode';

class WhatsAppService {
  constructor() {
    this.sock = null;
    this.qrCode = null;
    this.isConnected = false;
    this.logger = pino({ level: 'silent' }); // Silent logger for production
  }

  formatPhoneNumber(phoneNumber) {
    return phoneNumber.includes('@s.whatsapp.net')
      ? phoneNumber
      : `${phoneNumber}@s.whatsapp.net`;
  }

  /**
   * Initialize WhatsApp connection
   * This is COMPLETELY FREE - no API keys needed!
   */
  async initialize() {
    try {
      const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
      const { version } = await fetchLatestBaileysVersion();

      this.sock = makeWASocket({
        version,
        logger: this.logger,
        printQRInTerminal: true,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, this.logger),
        },
        browser: ['Auction Site', 'Chrome', '10.0'],
      });

      // Handle connection updates
      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          // Generate QR code for scanning
          this.qrCode = await QRCode.toDataURL(qr);
          console.log('📱 QR Code generated! Scan with WhatsApp to connect.');
        }

        if (connection === 'close') {
          const shouldReconnect = 
            (lastDisconnect?.error instanceof Boom) &&
            lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut;

          console.log('Connection closed. Reconnecting:', shouldReconnect);

          if (shouldReconnect) {
            await this.initialize();
          }
        } else if (connection === 'open') {
          this.isConnected = true;
          this.qrCode = null;
          console.log('✅ WhatsApp connected successfully!');
        }
      });

      // Save credentials when updated
      this.sock.ev.on('creds.update', saveCreds);

    } catch (error) {
      console.error('Failed to initialize WhatsApp:', error);
      throw error;
    }
  }

  /**
   * Send OTP to phone number for authentication
   * @param {string} phoneNumber - Phone number in international format (e.g., "1234567890")
   * @param {string} otp - The OTP code to send
   */
  async sendOTP(phoneNumber, otp) {
    if (!this.isConnected) {
      throw new Error('WhatsApp not connected. Please scan QR code first.');
    }

    try {
      const formattedNumber = this.formatPhoneNumber(phoneNumber);

      const message = `🔐 *Your Verification Code*\n\nYour OTP is: *${otp}*\n\nThis code will expire in 5 minutes.\n\n_Do not share this code with anyone._`;

      await this.sock.sendMessage(formattedNumber, { text: message });
      
      console.log(`✅ OTP sent to ${phoneNumber}`);
      return { success: true, message: 'OTP sent successfully' };
    } catch (error) {
      console.error('Failed to send OTP:', error);
      throw error;
    }
  }

  async sendTextMessage(phoneNumber, message) {
    if (!this.isConnected) {
      throw new Error('WhatsApp not connected. Please scan QR code first.');
    }

    if (!message || !String(message).trim()) {
      throw new Error('Message text is required');
    }

    const formattedNumber = this.formatPhoneNumber(phoneNumber);
    await this.sock.sendMessage(formattedNumber, { text: String(message) });
    return { success: true };
  }

  /**
   * Send auction notification to users
   * @param {string} phoneNumber - Phone number to notify
   * @param {object} auctionData - Auction details
   */
  async sendAuctionNotification(phoneNumber, auctionData) {
    if (!this.isConnected) {
      throw new Error('WhatsApp not connected. Please scan QR code first.');
    }

    try {
      const formattedNumber = this.formatPhoneNumber(phoneNumber);

      const message = `🔔 *New Auction Alert!*\n\n` +
        `📦 *${auctionData.title}*\n\n` +
        `💰 Starting Price: $${auctionData.startingPrice}\n` +
        `⏰ Starts: ${auctionData.startTime}\n` +
        `📍 Location: ${auctionData.location || 'Online'}\n\n` +
        `🔗 Bid now: ${auctionData.url}\n\n` +
        `_Good luck! 🍀_`;

      await this.sock.sendMessage(formattedNumber, { text: message });
      
      console.log(`✅ Auction notification sent to ${phoneNumber}`);
      return { success: true, message: 'Notification sent successfully' };
    } catch (error) {
      console.error('Failed to send auction notification:', error);
      throw error;
    }
  }

  /**
   * Send bulk notifications to multiple users
   * @param {Array} phoneNumbers - Array of phone numbers
   * @param {object} auctionData - Auction details
   */
  async sendBulkNotifications(phoneNumbers, auctionData) {
    const results = [];
    
    for (const phoneNumber of phoneNumbers) {
      try {
        await this.sendAuctionNotification(phoneNumber, auctionData);
        results.push({ phoneNumber, success: true });
        
        // Add delay to avoid rate limiting (1 second between messages)
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        results.push({ phoneNumber, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Get QR code for initial connection
   */
  getQRCode() {
    return this.qrCode;
  }

  /**
   * Check connection status
   */
  getConnectionStatus() {
    const connectedJid = this.sock?.user?.id || null;
    return {
      isConnected: this.isConnected,
      hasQRCode: !!this.qrCode,
      connectedJid
    };
  }

  /**
   * Disconnect WhatsApp
   */
  async disconnect() {
    if (this.sock) {
      await this.sock.logout();
      this.isConnected = false;
      console.log('WhatsApp disconnected');
    }
  }
}

// Export singleton instance
export default new WhatsAppService();
