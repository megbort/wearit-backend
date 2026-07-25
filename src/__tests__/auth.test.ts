import {
  generateToken,
  verifyToken,
  getUserFromToken,
  requireAuth,
  requireAdmin,
  hashToken,
} from '../utils/auth';
import { UserDocument } from '../models/User';
import { makeContext } from './testUtils';

const mockUser = {
  _id: '507f1f77bcf86cd799439011',
  email: 'test@example.com',
  role: 'user',
} as unknown as UserDocument;

const mockAdmin = {
  _id: '507f1f77bcf86cd799439012',
  email: 'admin@example.com',
  role: 'admin',
} as unknown as UserDocument;

describe('generateToken', () => {
  it('returns a JWT string with three parts', () => {
    const token = generateToken(mockUser);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  it('encodes the userId, email, and role in the payload', () => {
    const token = generateToken(mockUser);
    const payload = verifyToken(token);
    expect(payload?.userId).toBe('507f1f77bcf86cd799439011');
    expect(payload?.email).toBe('test@example.com');
    expect(payload?.role).toBe('user');
  });
});

describe('verifyToken', () => {
  it('returns the payload for a valid token', () => {
    const token = generateToken(mockUser);
    const payload = verifyToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.userId).toBe('507f1f77bcf86cd799439011');
    expect(payload?.email).toBe('test@example.com');
  });

  it('returns null for a tampered token', () => {
    const token = generateToken(mockUser);
    expect(verifyToken(token + 'tampered')).toBeNull();
  });

  it('returns null for a random string', () => {
    expect(verifyToken('not.a.real.token')).toBeNull();
  });
});

describe('getUserFromToken', () => {
  it('extracts the payload from a valid Bearer header', () => {
    const token = generateToken(mockUser);
    const payload = getUserFromToken(`Bearer ${token}`);
    expect(payload?.userId).toBe('507f1f77bcf86cd799439011');
    expect(payload?.email).toBe('test@example.com');
  });

  it('returns null when header is undefined', () => {
    expect(getUserFromToken(undefined)).toBeNull();
  });

  it('returns null for an invalid token in the header', () => {
    expect(getUserFromToken('Bearer invalid.token.here')).toBeNull();
  });
});

describe('requireAuth', () => {
  it('returns the payload for a valid Bearer header', () => {
    const token = generateToken(mockUser);
    const payload = requireAuth(makeContext(`Bearer ${token}`));
    expect(payload.userId).toBe('507f1f77bcf86cd799439011');
  });

  it('throws UNAUTHENTICATED when no header is provided', () => {
    expect(() => requireAuth(makeContext())).toThrow('You must be logged in');
    try {
      requireAuth(makeContext());
    } catch (error) {
      expect((error as { extensions: { code: string } }).extensions.code).toBe(
        'UNAUTHENTICATED'
      );
    }
  });

  it('throws for an invalid token', () => {
    expect(() => requireAuth(makeContext('Bearer bad.token.here'))).toThrow(
      'You must be logged in'
    );
  });
});

describe('requireAdmin', () => {
  it('returns the payload for an admin token', () => {
    const payload = requireAdmin(makeContext(`Bearer ${generateToken(mockAdmin)}`));
    expect(payload.role).toBe('admin');
  });

  it('throws FORBIDDEN for a non-admin token', () => {
    const context = makeContext(`Bearer ${generateToken(mockUser)}`);
    expect(() => requireAdmin(context)).toThrow('do not have permission');
    try {
      requireAdmin(context);
    } catch (error) {
      expect((error as { extensions: { code: string } }).extensions.code).toBe('FORBIDDEN');
    }
  });

  it('throws UNAUTHENTICATED when no token is provided', () => {
    expect(() => requireAdmin(makeContext())).toThrow('You must be logged in');
  });
});

describe('hashToken', () => {
  it('is deterministic and returns sha256 hex', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
    expect(hashToken('abc')).toMatch(/^[a-f0-9]{64}$/);
    expect(hashToken('abc')).not.toBe(hashToken('abd'));
  });
});
