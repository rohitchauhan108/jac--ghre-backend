import { Request, Response, NextFunction } from 'express';
import { verifyAuthToken } from '../auth.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
    }
  }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const header = req.header('authorization') || req.header('Authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Please sign in to continue.' });

  try {
    const payload = verifyAuthToken(token);
    req.userId = payload.sub;
    req.userEmail = payload.email;
    next();
  } catch {
    res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
  }
};

// Attaches the user if a valid token is present, but never blocks the request.
export const attachUserIfPresent = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.header('authorization') || req.header('Authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      const payload = verifyAuthToken(token);
      req.userId = payload.sub;
      req.userEmail = payload.email;
    } catch {
      // ignore invalid token for optional-auth routes
    }
  }
  next();
};
