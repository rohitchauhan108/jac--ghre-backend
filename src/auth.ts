import jwt from 'jsonwebtoken';
import { config } from './config.js';

export interface AuthTokenPayload {
  sub: string; // userId
  email: string;
}

export const signAuthToken = (payload: AuthTokenPayload): string => {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn as any });
};

export const verifyAuthToken = (token: string): AuthTokenPayload => {
  return jwt.verify(token, config.jwtSecret) as AuthTokenPayload;
};
