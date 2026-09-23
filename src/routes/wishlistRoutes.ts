import { Router } from 'express';
import { getWishlist, updateWishlist } from '../controllers/wishlistController.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();
router.use(requireAuth);
router.get('/', getWishlist);
router.put('/', updateWishlist);
export default router;