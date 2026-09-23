import { Schema, model } from 'mongoose';

const addressSchema = new Schema({
  customerName: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  address: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  pincode: { type: String, required: true, trim: true }
}, { _id: false });

const orderSchema = new Schema({
  orderId: { type: String, required: true, unique: true, index: true },
  items: [{ productId: String, name: String, weight: String, unitPrice: Number, quantity: Number }],
  customer: { type: addressSchema, required: true },
  subtotal: { type: Number, required: true },
  discount: { type: Number, required: true, default: 0 },
  shipping: { type: Number, required: true },
  total: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['upi', 'card', 'cod', 'netbanking'], required: true },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'cod_pending'], default: 'pending' },
  status: { type: String, enum: ['Processing', 'Dispatched', 'In Transit', 'Delivered', 'Cancelled'], default: 'Processing' },
  phonePeTransactionId: String,
  phonePeProviderReference: String,
  userId: String,
  estimatedDelivery: Date
}, { timestamps: true });

export const Order = model('Order', orderSchema);