import crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Cart } from '../models/Cart.js';

export const itemSchema = z.object({ productId: z.string().min(1), weight: z.string().min(1), quantity: z.number().int().min(1).max(50) });
const expiresAt = () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
const getCartId = (req: Request) => req.userId ? `user-${req.userId}` : req.header('x-cart-id') || crypto.randomUUID();
const getItemCount = (items: Array<{ quantity: number }>) => items.reduce((total, item) => total + item.quantity, 0);
const getCartQuery = (req: Request) => req.userId ? { userId: req.userId } : { cartId: getCartId(req) };

type CartItem = { productId: string; weight: string; quantity: number };

const plainItems = (items: unknown): CartItem[] => (items as CartItem[]).map(i => ({ productId: i.productId, weight: i.weight, quantity: i.quantity }));

export const getCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = getCartQuery(req);
    const cart = await Cart.findOneAndUpdate(query, { $setOnInsert: { cartId: getCartId(req), userId: req.userId, expiresAt: expiresAt() } }, { upsert: true, new: true, setDefaultsOnInsert: true }).lean();
    const items = plainItems(cart.items);
    res.json({ cartId: cart.cartId, items, itemCount: getItemCount(items) });
  } catch (error) { next(error); }
};

export const updateCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = z.array(itemSchema).parse(req.body.items);
    const query = getCartQuery(req);
    const cart = await Cart.findOneAndUpdate(query, { $set: { items, expiresAt: expiresAt() }, $setOnInsert: { cartId: getCartId(req), userId: req.userId } }, { upsert: true, new: true, setDefaultsOnInsert: true }).lean();
    const outItems = plainItems(cart.items);
    res.json({ cartId: cart.cartId, items: outItems, itemCount: getItemCount(outItems) });
  } catch (error) { next(error); }
};