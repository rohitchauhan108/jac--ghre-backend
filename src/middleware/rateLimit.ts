import rateLimit from 'express-rate-limit';
import { config } from '../config.js';

const NOOP_LIMITER = (_req: any, _res: any, next: any) => next();
const isDev = config.nodeEnv === 'development';

const newRateLimiter = (
  windowMinutes: number,
  limit: number,
  scope: string
) => {
  if (isDev) return NOOP_LIMITER as any;
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const auth = (req.headers.authorization || '').slice(0, 64);
      return `${scope}:${req.ip || 'unknown'}:${auth}`;
    },
    handler: (_req, res, _next, options) => {
      const retryAfter = Math.ceil(options.windowMs / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({
        message: `Too many ${scope} attempts. Please try again in ${retryAfter} seconds.`
      });
    }
  });
};

export const globalLimiter = isDev
  ? NOOP_LIMITER
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 1500,
      standardHeaders: true,
      legacyHeaders: false,
      message: { message: 'Too many requests overall. Please slow down and try again shortly.' }
    });

export const authLoginLimiter = newRateLimiter(15, 50, 'login');
export const authRegisterLimiter = newRateLimiter(60, 40, 'registration');
export const authOtpLimiter = newRateLimiter(10, 30, 'verification');
export const authPasswordLimiter = newRateLimiter(30, 25, 'password-reset');
export const authGeneralLimiter = newRateLimiter(15, 200, 'account');
export const ordersLimiter = newRateLimiter(15, 200, 'orders');
export const cartLimiter = newRateLimiter(15, 400, 'cart');
export const contactLimiter = newRateLimiter(60, 8, 'contact');
export const paymentLimiter = newRateLimiter(15, 60, 'payment');
