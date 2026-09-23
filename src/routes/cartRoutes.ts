import { Router } from 'express';
import { getCart, updateCart } from '../controllers/cartController.js';
import { attachUserIfPresent } from '../middleware/requireAuth.js';

const router = Router();
router.use(attachUserIfPresent);
router.get('/', getCart);
router.put('/', updateCart);
export default router;