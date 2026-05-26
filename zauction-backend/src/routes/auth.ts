import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { OAuth2Client } from 'google-auth-library';
import { randomBytes, randomInt } from 'crypto';
import { prisma } from '../config/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { notifyNewSubscriber, syncSubscriberToWhatsApp } from '../services/whatsappBridge';

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

type PendingRegistration = {
    email: string;
    fullName: string;
    phone: string;
    passwordHash: string;
    otp: string;
    expiresAt: number;
};

const pendingRegistrations = new Map<string, PendingRegistration>();

type PendingReset = {
    phone: string;
    otp: string;
    expiresAt: number;
};
const pendingResets = new Map<string, PendingReset>();
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
const PHONE_REGEX = /^\+?[0-9]{6,15}$/;

function normalizePhone(phone: string) {
    return phone.replace(/[\s\-()]/g, '');
}

function phoneToEmail(phone: string) {
    const digits = phone.replace(/\D/g, '');
    return `phone.${digits}@turathya.local`;
}

function signUserToken(user: { id: string; email: string; role: string; status: string }) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role,
            status: user.status
        },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
    );
}

function formatUserResponse(user: {
    id: string;
    email: string;
    fullName: string;
    phone?: string | null;
    role: string;
    status: string;
}) {
    return {
        id: user.id,
        email: user.email,
        phone: user.phone || null,
        full_name: user.fullName,
        role: user.role,
        status: user.status
    };
}

function generateOtp() {
    return randomInt(100000, 999999).toString();
}

function isWhatsAppOtpEnabled() {
    return process.env.WHATSAPP_OTP_ENABLED !== 'false';
}

async function sendOtpViaWhatsApp(phoneNumber: string, otp: string) {
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
            const payload = await response.json() as { error?: string; message?: string };
            message = payload?.error || payload?.message || message;
        } catch {
            const text = await response.text();
            if (text) {
                message = text;
            }
        }

        throw new Error(message);
    }
}

function getPendingRegistration(phone: string) {
    const pending = pendingRegistrations.get(phone);
    if (!pending) {
        return null;
    }

    if (Date.now() > pending.expiresAt) {
        pendingRegistrations.delete(phone);
        return null;
    }

    return pending;
}

// Request OTP for registration
router.post('/register/request-otp',
    [
        body('password').matches(PASSWORD_REGEX).withMessage('Password must be at least 8 characters and include uppercase, lowercase, number, and special character'),
        body('confirm_password').custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Password confirmation does not match');
            }
            return true;
        }),
        body('phone').trim().notEmpty().withMessage('Phone number is required').custom((value) => {
            const normalized = normalizePhone(value);
            if (!PHONE_REGEX.test(normalized)) {
                throw new Error('Phone number format is invalid');
            }
            return true;
        }),
        body('full_name').trim().notEmpty()
    ],
    async (req: AuthRequest, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: errors.array()[0].msg,
                    errors: errors.array()
                });
            }

            const { email, password, full_name, phone } = req.body;
            const normalizedPhone = normalizePhone(phone);
            const normalizedEmail = email && String(email).trim()
                ? String(email).toLowerCase().trim()
                : phoneToEmail(normalizedPhone);

            const existingUser = await prisma.user.findFirst({ where: { phone: normalizedPhone } });
            if (existingUser) {
                return res.status(400).json({ error: 'Phone number already registered' });
            }

            if (email && String(email).trim()) {
                const existingEmailUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
                if (existingEmailUser) {
                    return res.status(400).json({ error: 'Email already registered' });
                }
            }

            const passwordHash = await bcrypt.hash(password, 12);
            const otp = generateOtp();
            const expiresAt = Date.now() + 10 * 60 * 1000;

            pendingRegistrations.set(normalizedPhone, {
                email: normalizedEmail,
                fullName: full_name,
                phone: normalizedPhone,
                passwordHash,
                otp,
                expiresAt
            });

            if (isWhatsAppOtpEnabled()) {
                await sendOtpViaWhatsApp(normalizedPhone, otp);
            } else {
                throw new Error('WhatsApp OTP bridge is disabled. Set WHATSAPP_OTP_ENABLED=true.');
            }

            res.json({
                message: 'OTP sent via WhatsApp. It expires in 10 minutes.'
            });
        } catch (error: any) {
            console.error('Request OTP error:', error);
            res.status(500).json({ error: error.message || 'Failed to send OTP' });
        }
    }
);

// Verify OTP and complete registration
router.post('/register/verify-otp',
    [
        body('phone').trim().notEmpty().withMessage('Phone number is required').custom((value) => {
            const normalized = normalizePhone(value);
            if (!PHONE_REGEX.test(normalized)) {
                throw new Error('Phone number format is invalid');
            }
            return true;
        }),
        body('otp').isLength({ min: 6, max: 6 }).isNumeric()
    ],
    async (req: AuthRequest, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: errors.array()[0].msg,
                    errors: errors.array()
                });
            }

            const { phone, otp } = req.body;
            const normalizedPhone = normalizePhone(phone);
            const pending = getPendingRegistration(normalizedPhone);

            if (!pending) {
                return res.status(400).json({ error: 'OTP expired or not requested' });
            }

            if (pending.otp !== otp) {
                return res.status(400).json({ error: 'Invalid OTP' });
            }

            const existingUser = await prisma.user.findFirst({ where: { phone: normalizedPhone } });
            if (existingUser) {
                pendingRegistrations.delete(normalizedPhone);
                return res.status(400).json({ error: 'Phone number already registered' });
            }

            const existingEmailUser = await prisma.user.findUnique({ where: { email: pending.email } });
            if (existingEmailUser) {
                pendingRegistrations.delete(normalizedPhone);
                return res.status(400).json({ error: 'Email already registered' });
            }

            const user = await prisma.user.create({
                data: {
                    email: pending.email,
                    passwordHash: pending.passwordHash,
                    fullName: pending.fullName,
                    phone: normalizedPhone,
                    role: 'user',
                    status: 'pending'
                },
                select: {
                    id: true,
                    email: true,
                    fullName: true,
                    phone: true,
                    role: true,
                    status: true
                }
            });

            const token = signUserToken(user);

            pendingRegistrations.delete(normalizedPhone);

            void syncSubscriberToWhatsApp(pending.phone, pending.fullName).catch((error) => {
                console.error('WhatsApp subscriber sync failed:', error);
            });

            void notifyNewSubscriber({ fullName: pending.fullName }).catch((error) => {
                console.error('Automated WhatsApp notification (new subscriber) failed:', error);
            });

            res.status(201).json({
                message: 'Registration successful. Your account is pending admin approval.',
                token,
                user: formatUserResponse(user)
            });
        } catch (error) {
            console.error('Verify OTP error:', error);
            res.status(500).json({ error: 'OTP verification failed' });
        }
    }
);

// Google OAuth sign-in/register
router.post('/oauth/google',
    [
        body('id_token').notEmpty()
    ],
    async (req: AuthRequest, res: Response) => {
        try {
            const errors = validationResult(req);
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

            let user = await prisma.user.findUnique({
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
                user = await prisma.user.create({
                    data: {
                        email,
                        fullName,
                        passwordHash: await bcrypt.hash(randomBytes(32).toString('hex'), 12),
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

            if (isNewUser) {
                void notifyNewSubscriber({ fullName: user.fullName }).catch((error) => {
                    console.error('Automated WhatsApp notification (new subscriber) failed:', error);
                });
            }

            res.json({
                token,
                is_new_user: isNewUser,
                user: formatUserResponse(user)
            });
        } catch (error) {
            console.error('Google OAuth error:', error);
            res.status(401).json({ error: 'Invalid Google token' });
        }
    }
);

// Register new user
router.post('/register',
    [
        body('password').matches(PASSWORD_REGEX).withMessage('Password must be at least 8 characters and include uppercase, lowercase, number, and special character'),
        body('confirm_password').custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Password confirmation does not match');
            }
            return true;
        }),
        body('phone').trim().notEmpty().withMessage('Phone number is required').custom((value) => {
            const normalized = normalizePhone(value);
            if (!PHONE_REGEX.test(normalized)) {
                throw new Error('Phone number format is invalid');
            }
            return true;
        }),
        body('full_name').trim().notEmpty()
    ],
    async (req: AuthRequest, res: Response) => {
        try {
            // Validate input
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: errors.array()[0].msg,
                    errors: errors.array()
                });
            }

            const { email, password, full_name, phone, otp } = req.body;
            const normalizedPhone = normalizePhone(phone);
            const normalizedEmail = email && String(email).trim()
                ? String(email).toLowerCase().trim()
                : phoneToEmail(normalizedPhone);

            const pending = getPendingRegistration(normalizedPhone);
            if (!pending) {
                return res.status(400).json({
                    error: 'OTP required',
                    message: 'Request OTP first via /api/auth/register/request-otp'
                });
            }

            if (!otp || pending.otp !== otp) {
                return res.status(400).json({ error: 'Invalid OTP' });
            }

            pendingRegistrations.delete(normalizedPhone);

            // Check if user already exists
            const existingUser = await prisma.user.findFirst({ where: { phone: normalizedPhone } });

            if (existingUser) {
                return res.status(400).json({ error: 'Phone number already registered' });
            }

            if (email && String(email).trim()) {
                const existingEmailUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
                if (existingEmailUser) {
                    return res.status(400).json({ error: 'Email already registered' });
                }
            }

            // Hash password
            const passwordHash = await bcrypt.hash(password, 12);

            // Create user (status defaults to 'pending')
            const user = await prisma.user.create({
                data: {
                    email: normalizedEmail,
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
                    phone: true,
                    role: true,
                    status: true,
                    createdAt: true
                }
            });

            const token = signUserToken(user);

            void syncSubscriberToWhatsApp(normalizedPhone, full_name).catch((error) => {
                console.error('WhatsApp subscriber sync failed:', error);
            });

            void notifyNewSubscriber({ fullName: full_name }).catch((error) => {
                console.error('Automated WhatsApp notification (new subscriber) failed:', error);
            });

            res.status(201).json({
                message: 'Registration successful. Your account is pending admin approval.',
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    phone: user.phone,
                    full_name: user.fullName,
                    role: user.role,
                    status: user.status
                }
            });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ error: 'Registration failed' });
        }
    }
);

// ── Forgot Password: Request OTP ──────────────────────────────────────────
router.post('/forgot-password/request-otp',
    [
        body('phone').trim().notEmpty().withMessage('Phone number is required').custom((value) => {
            if (!PHONE_REGEX.test(normalizePhone(value))) throw new Error('Phone number format is invalid');
            return true;
        })
    ],
    async (req: AuthRequest, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ error: errors.array()[0].msg });
            }

            const normalizedPhone = normalizePhone(req.body.phone);

            // Always return the same message to prevent phone enumeration
            const user = await prisma.user.findFirst({ where: { phone: normalizedPhone } });
            if (!user) {
                return res.json({ message: 'If that number is registered, an OTP has been sent.' });
            }

            const otp = generateOtp();
            pendingResets.set(normalizedPhone, {
                phone: normalizedPhone,
                otp,
                expiresAt: Date.now() + 10 * 60 * 1000 // 10 min
            });

            if (isWhatsAppOtpEnabled()) {
                await sendOtpViaWhatsApp(normalizedPhone, otp);
            } else {
                throw new Error('WhatsApp OTP bridge is disabled.');
            }

            res.json({ message: 'OTP sent via WhatsApp. It expires in 10 minutes.' });
        } catch (error: any) {
            console.error('Forgot-password OTP error:', error);
            res.status(500).json({ error: error.message || 'Failed to send OTP' });
        }
    }
);

// ── Forgot Password: Reset ─────────────────────────────────────────────────
router.post('/forgot-password/reset',
    [
        body('phone').trim().notEmpty().custom((value) => {
            if (!PHONE_REGEX.test(normalizePhone(value))) throw new Error('Invalid phone number');
            return true;
        }),
        body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be 6 digits'),
        body('new_password')
            .matches(PASSWORD_REGEX)
            .withMessage('Password must be at least 8 characters and include uppercase, lowercase, number, and special character')
    ],
    async (req: AuthRequest, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ error: errors.array()[0].msg });
            }

            const { phone, otp, new_password } = req.body;
            const normalizedPhone = normalizePhone(phone);

            // Validate pending reset
            const pending = pendingResets.get(normalizedPhone);
            if (!pending || Date.now() > pending.expiresAt) {
                pendingResets.delete(normalizedPhone);
                return res.status(400).json({ error: 'OTP expired or not requested. Please start over.' });
            }

            if (pending.otp !== otp) {
                return res.status(400).json({ error: 'Invalid OTP. Please check the code and try again.' });
            }

            // Find user
            const user = await prisma.user.findFirst({ where: { phone: normalizedPhone } });
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            // Update password
            const passwordHash = await bcrypt.hash(new_password, 12);
            await prisma.user.update({
                where: { id: user.id },
                data: { passwordHash }
            });

            pendingResets.delete(normalizedPhone);

            res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
        } catch (error: any) {
            console.error('Password reset error:', error);
            res.status(500).json({ error: error.message || 'Failed to reset password' });
        }
    }
);

// Login
router.post('/login',
    [
        body('phone').trim().notEmpty().withMessage('Phone number is required').custom((value) => {
            const normalized = normalizePhone(value);
            if (!PHONE_REGEX.test(normalized)) {
                throw new Error('Phone number format is invalid');
            }
            return true;
        }),
        body('password').notEmpty()
    ],
    async (req: AuthRequest, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { phone, password } = req.body;
            const normalizedPhone = normalizePhone(phone);

            // Find user
            const user = await prisma.user.findFirst({
                where: { phone: normalizedPhone }
            });

            if (!user) {
                return res.status(401).json({ error: 'Invalid phone number or password' });
            }

            // Verify password
            const validPassword = await bcrypt.compare(password, user.passwordHash);
            if (!validPassword) {
                return res.status(401).json({ error: 'Invalid phone number or password' });
            }

            const token = signUserToken(user);

            res.json({
                token,
                user: formatUserResponse(user)
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Login failed' });
        }
    }
);

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.id },
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
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

export default router;
