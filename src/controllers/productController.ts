import { Request, Response, NextFunction } from 'express';
import { Product } from '../models/Product.js';

export const listProducts = async (_req: Request, res: Response, next: NextFunction) => {
  try { res.json({ products: await Product.find({ inStock: true }).lean() }); } catch (error) { next(error); }
};