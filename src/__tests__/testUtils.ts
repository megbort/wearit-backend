import { Context } from '../types';
import { User, UserDocument } from '../models/User';
import { generateToken } from '../utils/auth';
import { UserRole } from '../types/auth';

export interface MockContext extends Context {
  res: Context['res'] & { cookie: jest.Mock; clearCookie: jest.Mock };
}

// Fake express req/res good enough for resolver tests: headers + cookies in,
// cookie/clearCookie spies out
export const makeContext = (
  authHeader?: string,
  cookies: Record<string, string> = {}
): MockContext =>
  ({
    req: { headers: { authorization: authHeader }, cookies },
    res: { cookie: jest.fn(), clearCookie: jest.fn() },
  }) as unknown as MockContext;

let userCounter = 0;

// Creates a real user document with the given role and returns a valid Bearer
// header for it. Use when a test needs an admin (or a specific non-admin) caller
// without going through the register bootstrap.
export const createAuthedUser = async (
  role: UserRole = 'user',
  overrides: Partial<Pick<UserDocument, 'firstName' | 'lastName' | 'email'>> = {}
): Promise<{ user: UserDocument; authHeader: string }> => {
  userCounter += 1;
  const user = await User.create({
    firstName: 'Test',
    lastName: 'User',
    email: `authed-${userCounter}@example.com`,
    password: 'password123',
    role,
    ...overrides,
  });
  return { user, authHeader: `Bearer ${generateToken(user)}` };
};
