import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { userMutations } from '../resolvers/user';
import { User } from '../models/User';
import { RefreshToken } from '../models/RefreshToken';
import { hashToken, REFRESH_COOKIE_NAME } from '../utils/auth';
import { makeContext, MockContext } from './testUtils';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  await User.deleteMany({});
  await RefreshToken.deleteMany({});
});

const testUser = {
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  password: 'password123',
};

// Pulls the raw refresh token out of the res.cookie spy
const cookieValue = (context: MockContext): string => {
  const call = context.res.cookie.mock.calls.find(
    ([name]) => name === REFRESH_COOKIE_NAME
  );
  return call?.[1];
};

const registerWithCookie = async () => {
  const context = makeContext();
  const { user } = await userMutations.register(null, testUser, context);
  return { user, rawToken: cookieValue(context), context };
};

describe('login/register refresh cookie', () => {
  it('sets an httpOnly refresh cookie on register', async () => {
    const context = makeContext();
    await userMutations.register(null, testUser, context);

    const [name, value, options] = context.res.cookie.mock.calls[0];
    expect(name).toBe(REFRESH_COOKIE_NAME);
    expect(value).toMatch(/^[a-f0-9]{64}$/);
    expect(options).toMatchObject({ httpOnly: true, path: '/graphql' });
  });

  it('stores only the sha256 hash of the token', async () => {
    const { user, rawToken } = await registerWithCookie();

    const stored = await RefreshToken.findOne({ userId: user._id });
    expect(stored?.tokenHash).toBe(hashToken(rawToken));
    expect(stored?.tokenHash).not.toBe(rawToken);
  });

  it('sets a refresh cookie on login too', async () => {
    await registerWithCookie();
    const context = makeContext();
    await userMutations.login(
      null,
      { email: testUser.email, password: testUser.password },
      context
    );
    expect(cookieValue(context)).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('Mutation.refreshToken', () => {
  it('returns a new access token and rotates the refresh token', async () => {
    const { user, rawToken } = await registerWithCookie();

    const context = makeContext(undefined, { [REFRESH_COOKIE_NAME]: rawToken });
    const result = await userMutations.refreshToken(null, null, context);

    expect(result.token).toBeTruthy();
    expect(String(result.user._id)).toBe(String(user._id));

    const newRawToken = cookieValue(context);
    expect(newRawToken).toBeTruthy();
    expect(newRawToken).not.toBe(rawToken);

    // old hash consumed, only the new one remains
    expect(await RefreshToken.findOne({ tokenHash: hashToken(rawToken) })).toBeNull();
    expect(
      await RefreshToken.findOne({ tokenHash: hashToken(newRawToken) })
    ).not.toBeNull();
  });

  it('rejects a replayed (already-rotated) token', async () => {
    const { rawToken } = await registerWithCookie();

    await userMutations.refreshToken(
      null,
      null,
      makeContext(undefined, { [REFRESH_COOKIE_NAME]: rawToken })
    );

    await expect(
      userMutations.refreshToken(
        null,
        null,
        makeContext(undefined, { [REFRESH_COOKIE_NAME]: rawToken })
      )
    ).rejects.toThrow('Invalid or expired refresh token');
  });

  it('rejects an expired token', async () => {
    const { user, rawToken } = await registerWithCookie();
    await RefreshToken.updateOne(
      { userId: user._id },
      { expiresAt: new Date(Date.now() - 1000) }
    );

    const context = makeContext(undefined, { [REFRESH_COOKIE_NAME]: rawToken });
    await expect(userMutations.refreshToken(null, null, context)).rejects.toThrow(
      'Invalid or expired refresh token'
    );
    expect(context.res.clearCookie).toHaveBeenCalledWith(
      REFRESH_COOKIE_NAME,
      expect.objectContaining({ path: '/graphql' })
    );
  });

  it('rejects when no cookie is present', async () => {
    await expect(userMutations.refreshToken(null, null, makeContext())).rejects.toThrow(
      'No refresh token provided'
    );
  });

  it('rejects a garbage cookie and clears it', async () => {
    const context = makeContext(undefined, { [REFRESH_COOKIE_NAME]: 'garbage' });
    await expect(userMutations.refreshToken(null, null, context)).rejects.toThrow(
      'Invalid or expired refresh token'
    );
    expect(context.res.clearCookie).toHaveBeenCalled();
  });

  it('rejects when the user no longer exists', async () => {
    const { user, rawToken } = await registerWithCookie();
    await User.findByIdAndDelete(user._id);

    await expect(
      userMutations.refreshToken(
        null,
        null,
        makeContext(undefined, { [REFRESH_COOKIE_NAME]: rawToken })
      )
    ).rejects.toThrow('Invalid or expired refresh token');
  });
});

describe('Mutation.logout', () => {
  it('deletes the session and clears the cookie', async () => {
    const { user, rawToken } = await registerWithCookie();

    const context = makeContext(undefined, { [REFRESH_COOKIE_NAME]: rawToken });
    const result = await userMutations.logout(null, null, context);

    expect(result).toBe(true);
    expect(await RefreshToken.countDocuments({ userId: user._id })).toBe(0);
    expect(context.res.clearCookie).toHaveBeenCalledWith(
      REFRESH_COOKIE_NAME,
      expect.objectContaining({ path: '/graphql' })
    );
  });

  it('is safe to call without a cookie', async () => {
    const context = makeContext();
    await expect(userMutations.logout(null, null, context)).resolves.toBe(true);
    expect(context.res.clearCookie).toHaveBeenCalled();
  });
});
