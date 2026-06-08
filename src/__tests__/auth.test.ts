import { generateToken, verifyToken, getUserFromToken } from '../utils/auth';
import { UserDocument } from '../models/User';

const mockUser = {
  _id: '507f1f77bcf86cd799439011',
  email: 'test@example.com',
} as unknown as UserDocument;

describe('generateToken', () => {
  it('returns a JWT string with three parts', () => {
    const token = generateToken(mockUser);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  it('encodes the userId and email in the payload', () => {
    const token = generateToken(mockUser);
    const payload = verifyToken(token);
    expect(payload?.userId).toBe('507f1f77bcf86cd799439011');
    expect(payload?.email).toBe('test@example.com');
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
