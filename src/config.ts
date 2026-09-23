import 'dotenv/config';

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

export const config = {
  port: Number(process.env.PORT || 4000),
  mongoUri: required('MONGODB_URI'),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  apiPublicUrl: process.env.API_PUBLIC_URL || 'http://localhost:4000',
  phonePeMerchantId: process.env.PHONEPE_MERCHANT_ID || '',
  phonePeSaltKey: process.env.PHONEPE_SALT_KEY || '',
  phonePeSaltIndex: process.env.PHONEPE_SALT_INDEX || '1',
  phonePeBaseUrl: process.env.PHONEPE_BASE_URL || 'https://api-preprod.phonepe.com/apis/pg-sandbox',
  jwtSecret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? required('JWT_SECRET') : 'dev-only-insecure-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',
  resendApiKey: process.env.RESEND_API_KEY || '',
  resendFromEmail: process.env.RESEND_FROM_EMAIL || 'Jac Ghré <anujrankmantra190@gmail.com>',
  nodeEnv: process.env.NODE_ENV || 'development'
};
