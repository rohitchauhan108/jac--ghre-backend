import { Router } from 'express';
import { handleCallback, handleProviderCallback, getPayment } from '../controllers/paymentController.js';
import { paymentLimiter } from '../app.js';

const router = Router();
router.get('/callback', paymentLimiter, handleCallback);
router.post('/callback', paymentLimiter, handleProviderCallback);
router.get('/:orderId', paymentLimiter, getPayment);
export default router;