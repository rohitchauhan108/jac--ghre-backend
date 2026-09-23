import { Router } from 'express';
import { handleCallback, handleProviderCallback, getPayment } from '../controllers/paymentController.js';

const router = Router();
router.get('/callback', handleCallback);
router.post('/callback', handleProviderCallback);
router.get('/:orderId', getPayment);
export default router;