import { Router } from 'express';
import { register, verifyRegistration, resendRegistrationCode, login, requestPasswordReset, resetPassword, me, updateProfile } from '../controllers/authController.js';
import { requireAuth } from '../middleware/requireAuth.js';
import {
  authLoginLimiter,
  authRegisterLimiter,
  authOtpLimiter,
  authPasswordLimiter,
  authGeneralLimiter
} from '../middleware/rateLimit.js';

const router = Router();
router.post('/register', authRegisterLimiter, register);
router.post('/register/verify', authOtpLimiter, verifyRegistration);
router.post('/register/resend', authOtpLimiter, resendRegistrationCode);
router.post('/login', authLoginLimiter, login);
router.post('/password-reset/request', authPasswordLimiter, requestPasswordReset);
router.post('/password-reset/confirm', authPasswordLimiter, resetPassword);
router.get('/me', authGeneralLimiter, requireAuth, me);
router.put('/me', authGeneralLimiter, requireAuth, updateProfile);
export default router;
