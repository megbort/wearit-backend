import { User, UserDocument } from '../models/User';
import { RefreshToken } from '../models/RefreshToken';
import {
  generateToken,
  requireAuth,
  requireAdmin,
  hashToken,
  issueRefreshToken,
  revokeRefreshToken,
  refreshCookieOptions,
  REFRESH_COOKIE_NAME,
} from '../utils/auth';
import { GraphQLError } from 'graphql';
import { authenticationError, userInputError } from '../utils/errors';
import {
  Context,
  RegisterArgs,
  LoginArgs,
  UpdateUserArgs,
  UserQueryArgs,
  AuthPayload,
} from '../types';

const MIN_PASSWORD_LENGTH = 6;

// Emails that are auto-promoted to admin on register. This is the demo's
// bootstrap for the first admin; a real app would manage roles out of band.
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const userQueries = {
  me: async (_: unknown, __: unknown, context: Context): Promise<UserDocument | null> => {
    const authUser = requireAuth(context);
    try {
      return await User.findById(authUser.userId);
    } catch (error) {
      throw new Error(`Error fetching user: ${error}`);
    }
  },

  users: async (_: unknown, __: unknown, context: Context): Promise<UserDocument[]> => {
    requireAdmin(context);
    try {
      return await User.find({}).sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Error fetching users: ${error}`);
    }
  },

  user: async (
    _: unknown,
    { id }: UserQueryArgs,
    context: Context
  ): Promise<UserDocument | null> => {
    requireAdmin(context);
    try {
      return await User.findById(id);
    } catch (error) {
      throw new Error(`Error fetching user: ${error}`);
    }
  },
};

export const userMutations = {
  register: async (
    _: unknown,
    { firstName, lastName, email, password }: RegisterArgs,
    context: Context
  ): Promise<AuthPayload> => {
    try {
      const existingUser = await User.findOne({ email });
      if (existingUser) throw userInputError('A user with this email already exists');

      if (!firstName || !lastName || !email || !password) {
        throw userInputError('All fields are required');
      }

      if (password.length < MIN_PASSWORD_LENGTH) {
        throw userInputError(
          `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`
        );
      }

      const role = ADMIN_EMAILS.includes(email.toLowerCase()) ? 'admin' : 'user';
      const user = new User({ firstName, lastName, email, password, role });
      await user.save();
      await issueRefreshToken(String(user._id), context.res);
      return { token: generateToken(user), user };
    } catch (error) {
      if (error instanceof GraphQLError) throw error;
      throw new Error(`Error creating user: ${error}`);
    }
  },

  login: async (
    _: unknown,
    { email, password }: LoginArgs,
    context: Context
  ): Promise<AuthPayload> => {
    try {
      if (!email || !password) throw userInputError('Email and password are required');

      const user = await User.findOne({ email });
      if (!user) throw userInputError('Invalid email or password');

      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) throw userInputError('Invalid email or password');

      await issueRefreshToken(String(user._id), context.res);
      return { token: generateToken(user), user };
    } catch (error) {
      if (error instanceof GraphQLError) throw error;
      throw new Error(`Error logging in: ${error}`);
    }
  },

  refreshToken: async (_: unknown, __: unknown, context: Context): Promise<AuthPayload> => {
    const rawToken = context.req.cookies?.[REFRESH_COOKIE_NAME];
    if (!rawToken) throw authenticationError('No refresh token provided');

    // findOneAndDelete consumes the token atomically — each refresh token is
    // single-use (rotation), so a replayed token is rejected below
    const stored = await RefreshToken.findOneAndDelete({
      tokenHash: hashToken(rawToken),
    });

    if (!stored || stored.expiresAt < new Date()) {
      context.res.clearCookie(REFRESH_COOKIE_NAME, { path: refreshCookieOptions.path });
      throw authenticationError('Invalid or expired refresh token');
    }

    const user = await User.findById(stored.userId);
    if (!user) {
      context.res.clearCookie(REFRESH_COOKIE_NAME, { path: refreshCookieOptions.path });
      throw authenticationError('Invalid or expired refresh token');
    }

    await issueRefreshToken(String(user._id), context.res);
    return { token: generateToken(user), user };
  },

  logout: async (_: unknown, __: unknown, context: Context): Promise<boolean> => {
    await revokeRefreshToken(context.req, context.res);
    return true;
  },

  updateUser: async (
    _: unknown,
    { firstName, lastName, email }: UpdateUserArgs,
    context: Context
  ): Promise<UserDocument | null> => {
    const authUser = requireAuth(context);
    try {
      const updateData: Partial<Pick<UserDocument, 'firstName' | 'lastName' | 'email'>> = {};
      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;
      if (email) updateData.email = email;
      return await User.findByIdAndUpdate(authUser.userId, updateData, {
        new: true,
        runValidators: true,
      });
    } catch (error) {
      // The unique index rejects an email already taken by another account
      if (error instanceof Error && 'code' in error && error.code === 11000) {
        throw userInputError('Email already in use');
      }
      throw new Error(`Error updating user: ${error}`);
    }
  },

  deleteUser: async (_: unknown, __: unknown, context: Context): Promise<boolean> => {
    const authUser = requireAuth(context);
    try {
      const result = await User.findByIdAndDelete(authUser.userId);
      await RefreshToken.deleteMany({ userId: authUser.userId });
      context.res.clearCookie(REFRESH_COOKIE_NAME, { path: refreshCookieOptions.path });
      return result !== null;
    } catch (error) {
      throw new Error(`Error deleting user: ${error}`);
    }
  },
};
