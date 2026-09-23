import mongoose from 'mongoose';
import { config } from '../src/config.js';
import { Product } from '../src/models.js';
import { PRODUCTS } from '../../Frontend/src/data/products.ts';

await mongoose.connect(config.mongoUri);
await Product.deleteMany({});
await Product.insertMany(PRODUCTS.map(product => ({
  id: product.id,
  name: product.name,
  description: product.description,
  category: product.category,
  categoryLabel: product.categoryLabel,
  price: product.price,
  originalPrice: product.originalPrice,
  weight: product.weight,
  variants: product.variants,
  image: product.image,
  inStock: product.variants.some((variant: { inStock?: boolean }) => variant.inStock)
})));
console.log(`Seeded ${PRODUCTS.length} products`);
await mongoose.disconnect();
