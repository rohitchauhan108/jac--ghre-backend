import { Schema, model } from 'mongoose';

const cartItemSchema = new Schema({
  productId: { type: String, required: true },
  weight: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 }
}, { _id: false });

const cartSchema = new Schema({
  cartId: { type: String, required: true, unique: true, index: true },
  userId: { type: String, unique: true, sparse: true, index: true },
  items: { type: [cartItemSchema], default: [] },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }
}, { timestamps: true });

export const Cart = model('Cart', cartSchema);