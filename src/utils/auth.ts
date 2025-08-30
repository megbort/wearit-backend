import jwt from 'jsonwebtoken';
import { IUser } from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export interface AuthPayload {
  userId: string;
  email: string;
}

export const generateToken = (user: IUser): string => {
  const payload: AuthPayload = {
    userId: (user._id as any).toString(),
    email: user.email,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d',
  });
};

export const verifyToken = (token: string): AuthPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
};

export const getUserFromToken = (authHeader?: string): AuthPayload | null => {
  if (!authHeader) return null;

  const token = authHeader.replace('Bearer ', '');
  return verifyToken(token);
};
