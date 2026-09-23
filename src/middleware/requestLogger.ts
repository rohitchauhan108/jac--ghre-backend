import { Request, Response, NextFunction } from 'express';

const timestamp = () => new Date().toISOString();

const getStatusColor = (statusCode: number) => {
  if (statusCode >= 500) return '\x1b[31m';
  if (statusCode >= 400) return '\x1b[33m';
  if (statusCode >= 300) return '\x1b[36m';
  if (statusCode >= 200) return '\x1b[32m';
  return '\x1b[0m';
};

const methodColors: Record<string, string> = {
  GET: '\x1b[36m',
  POST: '\x1b[32m',
  PUT: '\x1b[33m',
  PATCH: '\x1b[35m',
  DELETE: '\x1b[31m',
};

const reset = '\x1b[0m';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const method = req.method;
  const url = req.originalUrl;
  const methodColor = methodColors[method] || '\x1b[0m';

  console.log(`\n${methodColor}[${method}]${reset} ${url} - ${timestamp()}`);
  const hasBody = req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0;
  if (hasBody && url.includes('auth')) {
    const safeBody = { ...req.body };
    if (safeBody.password) safeBody.password = '********';
    if (safeBody.newPassword) safeBody.newPassword = '********';
    if (safeBody.confirmPassword) safeBody.confirmPassword = '********';
    if (safeBody.otp) safeBody.otp = '****';
    console.log(`📦 Body:`, JSON.stringify(safeBody, null, 2));
  } else if (hasBody) {
    console.log(`📦 Body:`, JSON.stringify(req.body, null, 2));
  }
  if (req.query && typeof req.query === 'object' && Object.keys(req.query).length > 0) {
    console.log(`🔍 Query:`, JSON.stringify(req.query, null, 2));
  }
  if (req.userId) console.log(`👤 User: ${req.userId}`);

  const originalSend = res.send.bind(res);
  res.send = ((body: unknown) => {
    const duration = Date.now() - start;
    const statusColor = getStatusColor(res.statusCode);
    console.log(`${statusColor}← [${res.statusCode}]${reset} ${methodColor}${method}${reset} ${url} - ${duration}ms`);
    return originalSend(body);
  }) as typeof res.send;

  next();
};

export const startupLog = () => {
  const divider = '━'.repeat(60);
  console.log('\n' + divider);
  console.log('🚀  Jac Ghré Backend Starting...');
  console.log(divider + '\n');
};
