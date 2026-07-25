import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Request, Response, CookieOptions } from 'express';
import { UserDocument } from '../models/User';
import { RefreshToken } from '../models/RefreshToken';
import { Context, TokenPayload } from '../types';
import { authenticationError, forbiddenError } from './errors';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('Please define the JWT_SECRET environment variable');
}

const ACCESS_TOKEN_EXPIRY = '15m';

export const REFRESH_COOKIE_NAME = 'refresh_token';
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const isProd = process.env.NODE_ENV === 'production';

// Local dev (localhost:3000 -> localhost:4000) is same-site, so Lax works.
// Cross-site deployments (e.g. Vercel frontend -> Railway backend) need
// SameSite=None, which browsers only accept over HTTPS (secure: true).
export const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: isProd ? 'none' : 'lax',
  secure: isProd,
  path: '/graphql',
  maxAge: REFRESH_TOKEN_TTL_MS,
};

export const generateToken = (user: UserDocument): string => {
  const payload: TokenPayload = {
    userId: String(user._id),
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
};

export const verifyToken = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};

export const getUserFromToken = (authHeader?: string): TokenPayload | null => {
  if (!authHeader) return null;

  const token = authHeader.replace('Bearer ', '');
  return verifyToken(token);
};

export const requireAuth = (context: Context): TokenPayload => {
  const authUser = getUserFromToken(context.req.headers.authorization);
  if (!authUser) throw authenticationError('You must be logged in');
  return authUser;
};

// Requires a valid token AND an admin role claim. The role is read from the JWT,
// so a user promoted after their token was issued must re-login to gain access.
export const requireAdmin = (context: Context): TokenPayload => {
  const authUser = requireAuth(context);
  if (authUser.role !== 'admin') {
    throw forbiddenError('You do not have permission to perform this action');
  }
  return authUser;
};

export const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

// Creates a session record and sets the httpOnly cookie. Only the sha256 hash
// is stored, so a leaked database dump cannot be replayed as a session.
export const issueRefreshToken = async (
  userId: string,
  res: Response
): Promise<void> => {
  const rawToken = crypto.randomBytes(32).toString('hex');

  await RefreshToken.create({
    tokenHash: hashToken(rawToken),
    userId,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });

  res.cookie(REFRESH_COOKIE_NAME, rawToken, refreshCookieOptions);
};

export const revokeRefreshToken = async (
  req: Request,
  res: Response
): Promise<void> => {
  const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
  if (rawToken) {
    await RefreshToken.deleteOne({ tokenHash: hashToken(rawToken) });
  }
  res.clearCookie(REFRESH_COOKIE_NAME, { path: refreshCookieOptions.path });
};
