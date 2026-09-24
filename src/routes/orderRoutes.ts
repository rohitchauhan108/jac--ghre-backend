import { Router } from 'express';
import { createOrder, getOrder, getMyOrders } from '../controllers/orderController.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { ordersLimiter, paymentLimiter } from '../app.js';

const router = Router();
router.post('/', ordersLimiter, requireAuth, createOrder);
router.get('/mine', ordersLimiter, requireAuth, getMyOrders);
router.get('/:orderId', ordersLimiter, getOrder);
export default router;