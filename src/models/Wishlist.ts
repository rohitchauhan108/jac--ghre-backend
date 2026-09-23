import { Schema, model } from 'mongoose';

const wishlistSchema = new Schema({
  userId: { type: String, required: true, unique: true, index: true },
  productIds: { type: [String], default: [] }
}, { timestamps: true });

export const Wishlist = model('Wishlist', wishlistSchema);