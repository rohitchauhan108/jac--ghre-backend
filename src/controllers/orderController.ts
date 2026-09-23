import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { createPaymentOrder } from '../payment.js';
import { sendOrderConfirmationEmail } from '../email.js';
import { itemSchema } from './cartController.js';

const customerSchema = z.object({
  customerName: z.string().min(2), email: z.string().email(), phone: z.string().min(10), address: z.string().min(5),
  city: z.string().min(2), state: z.string().min(2), pincode: z.string().regex(/^\d{6}$/)
});
const checkoutSchema = z.object({
  items: z.array(itemSchema).min(1), customer: customerSchema,
  paymentMethod: z.enum(['upi', 'card', 'cod', 'netbanking'])
});

const shippingFor = (subtotal: number) => subtotal === 0 || subtotal >= 499 ? 0 : 49;

const priceItems = async (items: z.infer<typeof itemSchema>[]) => {
  const products = await Product.find({ id: { $in: items.map(item => item.productId) } }).lean();
  const byId = new Map(products.map(product => [product.id, product]));
  return items.map(item => {
    const product = byId.get(item.productId);
    if (!product) throw new Error(`Product not found: ${item.productId}`);
    const variant = (product.variants as Array<{ weight?: string | null; inStock?: boolean | null; price?: number | null }>).find(entry => entry.weight === item.weight);
    if (!variant || variant.inStock === false || variant.price == null) throw new Error(`${product.name} (${item.weight}) is unavailable`);
    return { productId: product.id, name: product.name, weight: item.weight, unitPrice: variant.price, quantity: item.quantity };
  });
};

export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Please sign in to place an order.' });
    const input = checkoutSchema.parse(req.body);
    const items = await priceItems(input.items);
    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const shipping = shippingFor(subtotal);
    const orderId = `JG-${Math.floor(100000 + Math.random() * 900000)}`;
    const paymentStatus = input.paymentMethod === 'cod' ? 'cod_pending' : 'pending';
    const order = await Order.create({ ...input, items, subtotal, discount: 0, shipping, total: subtotal + shipping, orderId, paymentStatus, userId: req.userId, estimatedDelivery: new Date(Date.now() + 4 * 86400000) });
    let payment = null;
    if (input.paymentMethod !== 'cod') {
      const gatewayOrder = await createPaymentOrder(order.total, orderId, input.customer.phone);
      order.phonePeTransactionId = orderId;
      await order.save();
      payment = { redirectUrl: gatewayOrder.redirectUrl };
    } else {
      // COD orders are confirmed immediately — email right away.
      sendOrderConfirmationEmail(order.toObject() as any).catch(() => {});
    }
    res.status(201).json({ order, payment });
  } catch (error) { next(error); }
};

export const getOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId }).lean();
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ order });
  } catch (error) { next(error); }
};

export const getMyOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Please sign in to continue.' });
    const orders = await Order.find({ userId: req.userId }).sort({ createdAt: -1 }).lean();
    res.json({ orders });
  } catch (error) { next(error); }
};