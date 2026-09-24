import { Router } from 'express';
import { getCart, updateCart } from '../controllers/cartController.js';
import { attachUserIfPresent } from '../middleware/requireAuth.js';
import { cartLimiter } from '../middleware/rateLimit.js';

const router = Router();
router.use(cartLimiter);
router.use(attachUserIfPresent);
router.get('/', getCart);
router.put('/', updateCart);
export default router;