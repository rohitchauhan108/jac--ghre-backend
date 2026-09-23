import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const timestamp = () => new Date().toISOString();

const logError = (req: Request, error: unknown) => {
  const divider = '═'.repeat(70);
  console.error('\n' + divider);
  console.error(`❌ [ERROR] ${timestamp()}`);
  console.error(`📍 Route: ${req.method} ${req.originalUrl}`);
  console.error(`👤 IP: ${req.ip}`);
  if (req.userId) console.error(`👤 UserId: ${req.userId}`);
  if (req.userEmail) console.error(`📧 UserEmail: ${req.userEmail}`);

  if (error instanceof Error) {
    console.error(`💥 Type: ${error.name}`);
    console.error(`📝 Message: ${error.message}`);
    if (error.stack) {
      console.error(`📊 Stack:\n${error.stack}`);
    }
  } else if (typeof error === 'object' && error !== null) {
    console.error('🔍 Error Object:', JSON.stringify(error, null, 2));
  } else {
    console.error('🔍 Unknown Error:', error);
  }
  console.error(divider + '\n');
};

export const errorHandler = (error: unknown, req: Request, res: Response, _next: NextFunction) => {
  logError(req, error);

  if (error instanceof z.ZodError) {
    const errors = error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
    console.error(`🔍 Zod Validation Errors: ${errors}`);
    return res.status(400).json({ message: 'Invalid request', errors: error.issues });
  }

  if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
    console.error('🔍 Duplicate Key (MongoDB 11000)');
    return res.status(409).json({ message: 'An account with this email already exists. Please sign in instead.' });
  }

  if (error && typeof error === 'object' && 'name' in error && error.name === 'ValidationError') {
    console.error('🔍 Mongoose Validation Error');
    return res.status(400).json({ message: 'Invalid account details.' });
  }

  const message = error instanceof Error ? error.message : 'Internal server error';
  const status = message.toLowerCase().includes('not found') || message.toLowerCase().includes('unavailable') ? 400 : 500;

  res.status(status).json({ message });
};

export const notFoundHandler = (req: Request, res: Response, _next: NextFunction) => {
  console.warn(`⚠️  [404] ${timestamp()} - ${req.method} ${req.originalUrl} - Not Found`);
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found` });
};
