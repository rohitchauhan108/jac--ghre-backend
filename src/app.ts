import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { phonePeConfigured } from './payment.js';
import { emailConfigured } from './email.js';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();

const allowedOrigins = [
  config.frontendUrl,
  'https://jac-ghre.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001'
].filter(Boolean) as string[];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true
};

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

const globalLimiter = isDev
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

app.use(requestLogger);
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(globalLimiter);

app.get('/', (_req, res) => res.send('backend in running'));
app.get('/api/health', (_req, res) => res.json({ ok: true, paymentConfigured: phonePeConfigured, emailConfigured }));
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/contact', contactRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
