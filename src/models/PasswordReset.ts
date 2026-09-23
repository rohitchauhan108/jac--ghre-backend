import { Schema, model } from 'mongoose';

const passwordResetSchema = new Schema({
  email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
  codeHash: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }
}, { timestamps: true });

export const PasswordReset = model('PasswordReset', passwordResetSchema);