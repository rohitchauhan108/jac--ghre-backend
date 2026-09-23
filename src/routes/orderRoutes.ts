import { Router } from 'express';
import { createOrder, getOrder, getMyOrders } from '../controllers/orderController.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();
// Checkout requires a signed-in user.
router.post('/', requireAuth, createOrder);
router.get('/mine', requireAuth, getMyOrders);
router.get('/:orderId', getOrder);
export default router;