import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { userQueries, userMutations } from '../resolvers/user';
import { User } from '../models/User';
import { RefreshToken } from '../models/RefreshToken';
import { makeContext, createAuthedUser } from './testUtils';

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

describe('Mutation.register', () => {
  it('creates a user and returns a token', async () => {
    const result = await userMutations.register(null, testUser, makeContext());
    expect(result.token).toBeTruthy();
    expect(result.user.email).toBe('jane@example.com');
    expect(result.user.firstName).toBe('Jane');
  });

  it('does not store the plaintext password', async () => {
    await userMutations.register(null, testUser, makeContext());
    const saved = await User.findOne({ email: testUser.email }).select('+password');
    expect(saved?.password).not.toBe(testUser.password);
  });

  it('throws if the email is already registered', async () => {
    await userMutations.register(null, testUser, makeContext());
    await expect(userMutations.register(null, testUser, makeContext())).rejects.toThrow(
      'A user with this email already exists'
    );
  });

  it('throws if password is shorter than 6 characters', async () => {
    await expect(
      userMutations.register(null, { ...testUser, password: '123' }, makeContext())
    ).rejects.toThrow('Password must be at least 6 characters');
  });

  it('registers a normal email as a regular user', async () => {
    const result = await userMutations.register(null, testUser, makeContext());
    expect(result.user.role).toBe('user');
  });

  it('promotes an ADMIN_EMAILS registrant to admin', async () => {
    const result = await userMutations.register(
      null,
      { ...testUser, email: 'boss@example.com' },
      makeContext()
    );
    expect(result.user.role).toBe('admin');
  });
});

describe('Mutation.login', () => {
  beforeEach(async () => {
    await userMutations.register(null, testUser, makeContext());
  });

  it('returns a token for valid credentials', async () => {
    const result = await userMutations.login(
      null,
      { email: testUser.email, password: testUser.password },
      makeContext()
    );
    expect(result.token).toBeTruthy();
    expect(result.user.email).toBe(testUser.email);
  });

  it('throws for a wrong password', async () => {
    await expect(
      userMutations.login(
        null,
        { email: testUser.email, password: 'wrongpassword' },
        makeContext()
      )
    ).rejects.toThrow('Invalid email or password');
  });

  it('throws for an unregistered email', async () => {
    await expect(
      userMutations.login(
        null,
        { email: 'nobody@example.com', password: testUser.password },
        makeContext()
      )
    ).rejects.toThrow('Invalid email or password');
  });
});

describe('Mutation.updateUser', () => {
  it('updates the authenticated user', async () => {
    const { token } = await userMutations.register(null, testUser, makeContext());
    const updated = await userMutations.updateUser(
      null,
      { firstName: 'Janet' },
      makeContext(`Bearer ${token}`)
    );
    expect(updated?.firstName).toBe('Janet');
    expect(updated?.lastName).toBe('Doe');
  });

  it('only modifies the caller, not other users', async () => {
    const { token } = await userMutations.register(null, testUser, makeContext());
    const other = await userMutations.register(
      null,
      { ...testUser, email: 'other@example.com' },
      makeContext()
    );
    await userMutations.updateUser(
      null,
      { firstName: 'Janet' },
      makeContext(`Bearer ${token}`)
    );
    const untouched = await User.findById(other.user._id);
    expect(untouched?.firstName).toBe('Jane');
  });

  it('throws when not authenticated', async () => {
    await expect(
      userMutations.updateUser(null, { firstName: 'Ghost' }, makeContext())
    ).rejects.toThrow('You must be logged in');
  });

  it('throws BAD_USER_INPUT when the new email is already taken', async () => {
    const { token } = await userMutations.register(null, testUser, makeContext());
    await userMutations.register(
      null,
      { ...testUser, email: 'taken@example.com' },
      makeContext()
    );
    await expect(
      userMutations.updateUser(
        null,
        { email: 'taken@example.com' },
        makeContext(`Bearer ${token}`)
      )
    ).rejects.toThrow('Email already in use');
  });
});

describe('Mutation.deleteUser', () => {
  it('deletes the authenticated user and their refresh tokens', async () => {
    const context = makeContext();
    const { token, user } = await userMutations.register(null, testUser, context);
    expect(await RefreshToken.countDocuments({ userId: user._id })).toBe(1);

    const result = await userMutations.deleteUser(
      null,
      null,
      makeContext(`Bearer ${token}`)
    );
    expect(result).toBe(true);
    expect(await User.findById(user._id)).toBeNull();
    expect(await RefreshToken.countDocuments({ userId: user._id })).toBe(0);
  });

  it('throws when not authenticated', async () => {
    await expect(userMutations.deleteUser(null, null, makeContext())).rejects.toThrow(
      'You must be logged in'
    );
  });
});

describe('Query.me', () => {
  it('returns the authenticated user', async () => {
    const { token, user } = await userMutations.register(null, testUser, makeContext());
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
  it('returns all registered users for an admin caller', async () => {
    const { authHeader } = await createAuthedUser('admin');
    await userMutations.register(null, testUser, makeContext());
    const users = await userQueries.users(null, null, makeContext(authHeader));
    expect(users).toHaveLength(2); // the admin + the registered user
  });

  it('throws ForbiddenError for a non-admin caller', async () => {
    const { authHeader } = await createAuthedUser('user');
    await expect(userQueries.users(null, null, makeContext(authHeader))).rejects.toThrow(
      'do not have permission'
    );
  });

  it('throws when not authenticated', async () => {
    await expect(userQueries.users(null, null, makeContext())).rejects.toThrow(
      'You must be logged in'
    );
  });
});

describe('Query.user', () => {
  it('returns a user by id for an admin caller', async () => {
    const { authHeader } = await createAuthedUser('admin');
    const { user } = await userMutations.register(null, testUser, makeContext());
    const result = await userQueries.user(
      null,
      { id: String(user._id) },
      makeContext(authHeader)
    );
    expect(result?.email).toBe(testUser.email);
  });

  it('returns null for a non-existent id', async () => {
    const { authHeader } = await createAuthedUser('admin');
    const result = await userQueries.user(
      null,
      { id: new mongoose.Types.ObjectId().toString() },
      makeContext(authHeader)
    );
    expect(result).toBeNull();
  });

  it('throws ForbiddenError for a non-admin caller', async () => {
    const { authHeader } = await createAuthedUser('user');
    await expect(
      userQueries.user(
        null,
        { id: new mongoose.Types.ObjectId().toString() },
        makeContext(authHeader)
      )
    ).rejects.toThrow('do not have permission');
  });

  it('throws when not authenticated', async () => {
    await expect(
      userQueries.user(null, { id: new mongoose.Types.ObjectId().toString() }, makeContext())
    ).rejects.toThrow('You must be logged in');
  });
});
