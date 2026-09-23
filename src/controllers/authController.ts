import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User.js';
import { EmailVerification } from '../models/EmailVerification.js';
import { PasswordReset } from '../models/PasswordReset.js';
import { signAuthToken } from '../auth.js';
import { sendPasswordResetEmail, sendVerificationEmail, sendWelcomeEmail } from '../email.js';
import crypto from 'node:crypto';

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().min(10),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const verificationSchema = z.object({
  email: z.string().email(),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits')
});

const registrationCode = () => String(crypto.randomInt(100000, 1000000));
const hashCode = (code: string) => crypto.createHash('sha256').update(code).digest('hex');
const passwordResetRequestSchema = z.object({ email: z.string().email() });
const passwordResetSchema = z.object({ email: z.string().email(), otp: z.string().regex(/^\d{6}$/), password: z.string().min(6) });

const toPublicUser = (user: {
  _id: unknown;
  name: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  createdAt?: Date;
}) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  phone: user.phone,
  address: user.address || '',
  city: user.city || '',
  state: user.state || '',
  pincode: user.pincode || '',
  joinedDate: user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : ''
});

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = registerSchema.parse(req.body);
    const email = input.email.trim().toLowerCase();
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'An account with this email already exists. Please sign in instead.' });

    const passwordHash = await bcrypt.hash(input.password, 10);
    const code = registrationCode();
    await EmailVerification.findOneAndUpdate({ email }, {
      email,
      name: input.name,
      passwordHash,
      phone: input.phone,
      address: input.address || '',
      city: input.city || '',
      state: input.state || '',
      pincode: input.pincode || '',
      codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    }, { upsert: true, new: true, setDefaultsOnInsert: true });
    await sendVerificationEmail(email, input.name, code);
    res.status(202).json({ verificationRequired: true, email, message: 'A verification code has been sent to your email.' });
  } catch (error) { next(error); }
};

export const verifyRegistration = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = verificationSchema.parse(req.body);
    const email = input.email.trim().toLowerCase();
    const pending = await EmailVerification.findOne({ email });
    if (!pending || pending.expiresAt.getTime() < Date.now() || pending.codeHash !== hashCode(input.otp)) {
      return res.status(400).json({ message: 'That verification code is invalid or expired.' });
    }
    const user = await User.create({
      name: pending.name,
      email,
      passwordHash: pending.passwordHash,
      phone: pending.phone,
      address: pending.address,
      city: pending.city,
      state: pending.state,
      pincode: pending.pincode,
      emailVerified: true
    });
    await EmailVerification.deleteOne({ _id: pending._id });
    const token = signAuthToken({ sub: String(user._id), email: user.email });
    sendWelcomeEmail(user.email, user.name).catch(() => {});
    res.status(201).json({ token, user: toPublicUser(user) });
  } catch (error) { next(error); }
};

export const resendRegistrationCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = z.object({ email: z.string().email() }).parse(req.body);
    const email = input.email.trim().toLowerCase();
    const pending = await EmailVerification.findOne({ email });
    if (!pending) return res.status(404).json({ message: 'No pending account verification was found.' });
    const code = registrationCode();
    pending.codeHash = hashCode(code);
    pending.expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await pending.save();
    await sendVerificationEmail(email, pending.name, code);
    res.json({ message: 'A new verification code has been sent.' });
  } catch (error) { next(error); }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = loginSchema.parse(req.body);
    const user = await User.findOne({ email: input.email.toLowerCase() });
    if (!user) return res.status(401).json({ message: 'Invalid email or password.' });

    const matches = await bcrypt.compare(input.password, user.passwordHash);
    if (!matches) return res.status(401).json({ message: 'Invalid email or password.' });

    const token = signAuthToken({ sub: String(user._id), email: user.email });
    res.json({ token, user: toPublicUser(user) });
  } catch (error) { next(error); }
};

export const requestPasswordReset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email: rawEmail } = passwordResetRequestSchema.parse(req.body);
    const email = rawEmail.trim().toLowerCase();
    const user = await User.findOne({ email });
    if (user) {
      const code = registrationCode();
      await PasswordReset.findOneAndUpdate(
        { email },
        { email, codeHash: hashCode(code), expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      await sendPasswordResetEmail(email, user.name, code);
    }
    res.json({ message: 'If an account exists for that email, a password reset code has been sent.' });
  } catch (error) { next(error); }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = passwordResetSchema.parse(req.body);
    const email = input.email.trim().toLowerCase();
    const reset = await PasswordReset.findOne({ email });
    if (!reset || reset.expiresAt.getTime() < Date.now() || reset.codeHash !== hashCode(input.otp)) {
      return res.status(400).json({ message: 'That reset code is invalid or expired.' });
    }
    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await User.findOneAndUpdate({ email }, { passwordHash }, { new: true });
    if (!user) return res.status(400).json({ message: 'Account not found.' });
    await PasswordReset.deleteOne({ _id: reset._id });
    res.json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (error) { next(error); }
};

export const me = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Not signed in.' });
    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ message: 'Account no longer exists.' });
    res.json({ user: toPublicUser(user) });
  } catch (error) { next(error); }
};

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(10).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional()
});

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Not signed in.' });
    const input = updateSchema.parse(req.body);
    const user = await User.findByIdAndUpdate(req.userId, input, { new: true });
    if (!user) return res.status(401).json({ message: 'Account no longer exists.' });
    res.json({ user: toPublicUser(user) });
  } catch (error) { next(error); }
};
