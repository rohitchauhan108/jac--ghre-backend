import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Wishlist } from '../models/Wishlist.js';

const wishlistSchema = z.object({ productIds: z.array(z.string().min(1)).max(500) });

export const getWishlist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Please sign in to use your wishlist.' });
    const wishlist = await Wishlist.findOne({ userId: req.userId }).lean();
    res.json({ productIds: wishlist?.productIds || [] });
  } catch (error) { next(error); }
};

export const updateWishlist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Please sign in to use your wishlist.' });
    const { productIds } = wishlistSchema.parse(req.body);
    const uniqueProductIds = [...new Set(productIds)];
    const wishlist = await Wishlist.findOneAndUpdate(
      { userId: req.userId },
      { userId: req.userId, productIds: uniqueProductIds },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    res.json({ productIds: wishlist.productIds });
  } catch (error) { next(error); }
};