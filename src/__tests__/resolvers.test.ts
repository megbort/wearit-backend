import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { userQueries, userMutations } from '../resolvers/user';
import { User } from '../models/User';
import { Context } from '../types';

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
});

const makeContext = (authHeader?: string): Context => ({
  req: { headers: { authorization: authHeader } },
});

const testUser = {
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  password: 'password123',
};

describe('Mutation.register', () => {
  it('creates a user and returns a token', async () => {
    const result = await userMutations.register(null, testUser);
    expect(result.token).toBeTruthy();
    expect(result.user.email).toBe('jane@example.com');
    expect(result.user.firstName).toBe('Jane');
  });

  it('does not store the plaintext password', async () => {
    await userMutations.register(null, testUser);
    const saved = await User.findOne({ email: testUser.email }).select('+password');
    expect(saved?.password).not.toBe(testUser.password);
  });

  it('throws if the email is already registered', async () => {
    await userMutations.register(null, testUser);
    await expect(userMutations.register(null, testUser)).rejects.toThrow(
      'A user with this email already exists'
    );
  });

  it('throws if password is shorter than 6 characters', async () => {
    await expect(
      userMutations.register(null, { ...testUser, password: '123' })
    ).rejects.toThrow('Password must be at least 6 characters');
  });
});

describe('Mutation.login', () => {
  beforeEach(async () => {
    await userMutations.register(null, testUser);
  });

  it('returns a token for valid credentials', async () => {
    const result = await userMutations.login(null, {
      email: testUser.email,
      password: testUser.password,
    });
    expect(result.token).toBeTruthy();
    expect(result.user.email).toBe(testUser.email);
  });

  it('throws for a wrong password', async () => {
    await expect(
      userMutations.login(null, { email: testUser.email, password: 'wrongpassword' })
    ).rejects.toThrow('Invalid email or password');
  });

  it('throws for an unregistered email', async () => {
    await expect(
      userMutations.login(null, { email: 'nobody@example.com', password: testUser.password })
    ).rejects.toThrow('Invalid email or password');
  });
});

describe('Mutation.updateUser', () => {
  it('updates the specified fields', async () => {
    const { user } = await userMutations.register(null, testUser);
    const updated = await userMutations.updateUser(null, {
      id: String(user._id),
      firstName: 'Janet',
    });
    expect(updated?.firstName).toBe('Janet');
    expect(updated?.lastName).toBe('Doe');
  });

  it('returns null for a non-existent id', async () => {
    const result = await userMutations.updateUser(null, {
      id: new mongoose.Types.ObjectId().toString(),
      firstName: 'Ghost',
    });
    expect(result).toBeNull();
  });
});

describe('Mutation.deleteUser', () => {
  it('deletes the user and returns true', async () => {
    const { user } = await userMutations.register(null, testUser);
    const result = await userMutations.deleteUser(null, { id: String(user._id) });
    expect(result).toBe(true);
    expect(await User.findById(user._id)).toBeNull();
  });

  it('returns false for a non-existent id', async () => {
    const result = await userMutations.deleteUser(null, {
      id: new mongoose.Types.ObjectId().toString(),
    });
    expect(result).toBe(false);
  });
});

describe('Query.me', () => {
  it('returns the authenticated user', async () => {
    const { token, user } = await userMutations.register(null, testUser);
    const result = await userQueries.me(null, null, makeContext(`Bearer ${token}`));
    expect(String(result?._id)).toBe(String(user._id));
    expect(result?.email).toBe(testUser.email);
  });

  it('throws AuthenticationError when no token is provided', async () => {
    await expect(userQueries.me(null, null, makeContext())).rejects.toThrow(
      'You must be logged in'
    );
  });
});

describe('Query.users', () => {
  it('returns all registered users', async () => {
    await userMutations.register(null, testUser);
    await userMutations.register(null, { ...testUser, email: 'other@example.com' });
    const users = await userQueries.users();
    expect(users).toHaveLength(2);
  });

  it('returns an empty array when no users exist', async () => {
    const users = await userQueries.users();
    expect(users).toHaveLength(0);
  });
});

describe('Query.user', () => {
  it('returns a user by id', async () => {
    const { user } = await userMutations.register(null, testUser);
    const result = await userQueries.user(null, { id: String(user._id) });
    expect(result?.email).toBe(testUser.email);
  });

  it('returns null for a non-existent id', async () => {
    const result = await userQueries.user(null, {
      id: new mongoose.Types.ObjectId().toString(),
    });
    expect(result).toBeNull();
  });
});
