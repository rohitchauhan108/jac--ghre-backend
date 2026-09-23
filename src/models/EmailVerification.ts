import { Schema, model } from 'mongoose';

const emailVerificationSchema = new Schema({
  email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
  name: { type: String, required: true },
  passwordHash: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  pincode: { type: String, default: '' },
  codeHash: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }
}, { timestamps: true });

export const EmailVerification = model('EmailVerification', emailVerificationSchema);