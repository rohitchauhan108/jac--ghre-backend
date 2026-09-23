import { Schema, model } from 'mongoose';

const productSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  category: { type: String, required: true },
  categoryLabel: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  originalPrice: { type: Number, min: 0 },
  weight: { type: String, required: true },
  variants: [{ weight: String, price: Number, originalPrice: Number, inStock: Boolean }],
  image: { type: String, default: '' },
  inStock: { type: Boolean, default: true }
}, { timestamps: true });

export const Product = model('Product', productSchema);