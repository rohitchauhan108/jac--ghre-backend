import { Router } from 'express';
import { register, verifyRegistration, resendRegistrationCode, login, requestPasswordReset, resetPassword, me, updateProfile } from '../controllers/authController.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();
router.post('/register', register);
router.post('/register/verify', verifyRegistration);
router.post('/register/resend', resendRegistrationCode);
router.post('/login', login);
router.post('/password-reset/request', requestPasswordReset);
router.post('/password-reset/confirm', resetPassword);
router.get('/me', requireAuth, me);
router.put('/me', requireAuth, updateProfile);
export default router;
