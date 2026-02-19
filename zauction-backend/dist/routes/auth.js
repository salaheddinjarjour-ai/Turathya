"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const express_validator_1 = require("express-validator");
const google_auth_library_1 = require("google-auth-library");
const nodemailer_1 = __importDefault(require("nodemailer"));
const crypto_1 = require("crypto");
const prisma_1 = require("../config/prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const googleClient = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const pendingRegistrations = new Map();
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
const PHONE_REGEX = /^\+?[0-9]{8,15}$/;
function normalizePhone(phone) {
    return phone.replace(/[\s\-()]/g, '');
}
function signUserToken(user) {
    return jsonwebtoken_1.default.sign({
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status
    }, process.env.JWT_SECRET, { expiresIn: '7d' });
}
function formatUserResponse(user) {
    return {
        id: user.id,
        email: user.email,
        full_name: user.fullName,
        role: user.role,
        status: user.status
    };
}
async function sendOtpEmail(email, otp) {
    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
    if (!gmailUser || !gmailAppPassword) {
        throw new Error('Gmail SMTP credentials are missing. Set GMAIL_USER and GMAIL_APP_PASSWORD.');
    }
    const transporter = nodemailer_1.default.createTransport({
        service: 'gmail',
        auth: {
            user: gmailUser,
            pass: gmailAppPassword
        }
    });
    await transporter.sendMail({
        from: `Zauction <${gmailUser}>`,
        to: email,
        subject: 'Your Zauction verification code',
        text: `Your verification code is: ${otp}. This code expires in 10 minutes.`,
        html: `<p>Your verification code is:</p><h2 style="letter-spacing:4px">${otp}</h2><p>This code expires in 10 minutes.</p>`
    });
}
function hasEmailOtpChannelConfigured() {
    return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}
function generateOtp() {
    return (0, crypto_1.randomInt)(100000, 999999).toString();
}
function isOtpRequired() {
    return process.env.EMAIL_OTP_REQUIRED === 'true';
}
function isWhatsAppOtpEnabled() {
    return process.env.WHATSAPP_OTP_ENABLED === 'true';
}
async function sendOtpViaWhatsApp(phoneNumber, otp) {
    const bridgeUrl = (process.env.WHATSAPP_BRIDGE_URL || 'http://localhost:3001').replace(/\/$/, '');
    const digitsOnlyPhone = phoneNumber.replace(/\D/g, '');
    if (!digitsOnlyPhone) {
        throw new Error('Phone number is invalid for WhatsApp delivery');
    }
    const response = await fetch(`${bridgeUrl}/api/auth/send-otp-direct`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phoneNumber: digitsOnlyPhone, otp })
    });
    if (!response.ok) {
        let message = `WhatsApp OTP request failed (${response.status})`;
        try {
            const payload = await response.json();
            message = payload?.error || payload?.message || message;
        }
        catch {
            const text = await response.text();
            if (text) {
                message = text;
            }
        }
        throw new Error(message);
    }
}
function getPendingRegistration(email) {
    const pending = pendingRegistrations.get(email);
    if (!pending) {
        return null;
    }
    if (Date.now() > pending.expiresAt) {
        pendingRegistrations.delete(email);
        return null;
    }
    return pending;
}
// Request OTP for registration
router.post('/register/request-otp', [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('password').matches(PASSWORD_REGEX).withMessage('Password must be at least 8 characters and include uppercase, lowercase, number, and special character'),
    (0, express_validator_1.body)('confirm_password').custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('Password confirmation does not match');
        }
        return true;
    }),
    (0, express_validator_1.body)('phone').trim().notEmpty().withMessage('Phone number is required').custom((value) => {
        const normalized = normalizePhone(value);
        if (!PHONE_REGEX.test(normalized)) {
            throw new Error('Phone number format is invalid');
        }
        return true;
    }),
    (0, express_validator_1.body)('full_name').trim().notEmpty()
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: errors.array()[0].msg,
                errors: errors.array()
            });
        }
        const { email, password, full_name, phone } = req.body;
        const normalizedPhone = normalizePhone(phone);
        const existingUser = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        const passwordHash = await bcrypt_1.default.hash(password, 12);
        const otp = generateOtp();
        const expiresAt = Date.now() + 10 * 60 * 1000;
        pendingRegistrations.set(email, {
            email,
            fullName: full_name,
            phone: normalizedPhone,
            passwordHash,
            otp,
            expiresAt
        });
        const deliveryPromises = [];
        if (hasEmailOtpChannelConfigured()) {
            deliveryPromises.push(sendOtpEmail(email, otp).then(() => ({ channel: 'email' })));
        }
        if (isWhatsAppOtpEnabled()) {
            deliveryPromises.push(sendOtpViaWhatsApp(normalizedPhone, otp).then(() => ({ channel: 'whatsapp' })));
        }
        if (deliveryPromises.length === 0) {
            throw new Error('No OTP delivery channel is configured. Configure Gmail SMTP or enable WhatsApp OTP bridge.');
        }
        const deliveryResults = await Promise.allSettled(deliveryPromises);
        const successfulChannels = deliveryResults
            .filter((result) => result.status === 'fulfilled')
            .map((result) => result.value.channel);
        if (successfulChannels.length === 0) {
            throw new Error('Failed to deliver OTP through configured channels');
        }
        const failedDeliveries = deliveryResults
            .filter((result) => result.status === 'rejected')
            .map((result) => result.reason?.message || 'Unknown delivery error');
        res.json({
            message: `OTP sent via ${successfulChannels.join(' and ')}. It expires in 10 minutes.`,
            warning: failedDeliveries.length > 0 ? `Some delivery channels failed: ${failedDeliveries.join(' | ')}` : undefined
        });
    }
    catch (error) {
        console.error('Request OTP error:', error);
        res.status(500).json({ error: error.message || 'Failed to send OTP' });
    }
});
// Verify OTP and complete registration
router.post('/register/verify-otp', [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('otp').isLength({ min: 6, max: 6 }).isNumeric()
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: errors.array()[0].msg,
                errors: errors.array()
            });
        }
        const { email, otp } = req.body;
        const pending = getPendingRegistration(email);
        if (!pending) {
            return res.status(400).json({ error: 'OTP expired or not requested' });
        }
        if (pending.otp !== otp) {
            return res.status(400).json({ error: 'Invalid OTP' });
        }
        const existingUser = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            pendingRegistrations.delete(email);
            return res.status(400).json({ error: 'Email already registered' });
        }
        const user = await prisma_1.prisma.user.create({
            data: {
                email,
                passwordHash: pending.passwordHash,
                fullName: pending.fullName,
                phone: pending.phone,
                role: 'user',
                status: 'pending'
            },
            select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
                status: true
            }
        });
        const token = signUserToken(user);
        pendingRegistrations.delete(email);
        res.status(201).json({
            message: 'Registration successful. Your account is pending admin approval.',
            token,
            user: formatUserResponse(user)
        });
    }
    catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ error: 'OTP verification failed' });
    }
});
// Google OAuth sign-in/register
router.post('/oauth/google', [
    (0, express_validator_1.body)('id_token').notEmpty()
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const googleClientId = process.env.GOOGLE_CLIENT_ID;
        if (!googleClientId) {
            return res.status(500).json({ error: 'GOOGLE_CLIENT_ID is not configured' });
        }
        const { id_token } = req.body;
        const ticket = await googleClient.verifyIdToken({
            idToken: id_token,
            audience: googleClientId
        });
        const payload = ticket.getPayload();
        if (!payload?.email) {
            return res.status(400).json({ error: 'Google account email is required' });
        }
        const email = payload.email.toLowerCase();
        const fullName = payload.name || email.split('@')[0];
        let user = await prisma_1.prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
                status: true
            }
        });
        let isNewUser = false;
        if (!user) {
            isNewUser = true;
            user = await prisma_1.prisma.user.create({
                data: {
                    email,
                    fullName,
                    passwordHash: await bcrypt_1.default.hash((0, crypto_1.randomBytes)(32).toString('hex'), 12),
                    role: 'user',
                    status: 'pending'
                },
                select: {
                    id: true,
                    email: true,
                    fullName: true,
                    role: true,
                    status: true
                }
            });
        }
        const token = signUserToken(user);
        res.json({
            token,
            is_new_user: isNewUser,
            user: formatUserResponse(user)
        });
    }
    catch (error) {
        console.error('Google OAuth error:', error);
        res.status(401).json({ error: 'Invalid Google token' });
    }
});
// Register new user
router.post('/register', [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('password').matches(PASSWORD_REGEX).withMessage('Password must be at least 8 characters and include uppercase, lowercase, number, and special character'),
    (0, express_validator_1.body)('confirm_password').custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('Password confirmation does not match');
        }
        return true;
    }),
    (0, express_validator_1.body)('phone').trim().notEmpty().withMessage('Phone number is required').custom((value) => {
        const normalized = normalizePhone(value);
        if (!PHONE_REGEX.test(normalized)) {
            throw new Error('Phone number format is invalid');
        }
        return true;
    }),
    (0, express_validator_1.body)('full_name').trim().notEmpty()
], async (req, res) => {
    try {
        // Validate input
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: errors.array()[0].msg,
                errors: errors.array()
            });
        }
        const { email, password, full_name, phone, otp } = req.body;
        const normalizedPhone = normalizePhone(phone);
        if (isOtpRequired()) {
            const pending = getPendingRegistration(email);
            if (!pending) {
                return res.status(400).json({
                    error: 'OTP required',
                    message: 'Request OTP first via /api/auth/register/request-otp'
                });
            }
            if (!otp || pending.otp !== otp) {
                return res.status(400).json({ error: 'Invalid OTP' });
            }
            pendingRegistrations.delete(email);
        }
        // Check if user already exists
        const existingUser = await prisma_1.prisma.user.findUnique({
            where: { email }
        });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        // Hash password
        const passwordHash = await bcrypt_1.default.hash(password, 12);
        // Create user (status defaults to 'pending')
        const user = await prisma_1.prisma.user.create({
            data: {
                email,
                passwordHash,
                fullName: full_name,
                phone: normalizedPhone,
                role: 'user',
                status: 'pending'
            },
            select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
                status: true,
                createdAt: true
            }
        });
        const token = signUserToken(user);
        res.status(201).json({
            message: 'Registration successful. Your account is pending admin approval.',
            token,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.fullName,
                role: user.role,
                status: user.status
            }
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});
// Login
router.post('/login', [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('password').notEmpty()
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { email, password } = req.body;
        // Find user
        const user = await prisma_1.prisma.user.findUnique({
            where: { email }
        });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        // Verify password
        const validPassword = await bcrypt_1.default.compare(password, user.passwordHash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        const token = signUserToken(user);
        res.json({
            token,
            user: formatUserResponse(user)
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});
// Get current user
router.get('/me', auth_1.authenticate, async (req, res) => {
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
                status: true,
                createdAt: true
            }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({
            user: {
                ...user,
                full_name: user.fullName,
                created_at: user.createdAt
            }
        });
    }
    catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map