import { User, UserDocument } from '../models/User';
import { generateToken, getUserFromToken } from '../utils/auth';
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

export const userQueries = {
  me: async (_: unknown, __: unknown, context: Context): Promise<UserDocument | null> => {
    const authUser = getUserFromToken(context.req.headers.authorization);
    if (!authUser) throw authenticationError('You must be logged in to access this');
    try {
      return await User.findById(authUser.userId);
    } catch (error) {
      throw new Error(`Error fetching user: ${error}`);
    }
  },

  users: async (): Promise<UserDocument[]> => {
    try {
      return await User.find({}).sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Error fetching users: ${error}`);
    }
  },

  user: async (_: unknown, { id }: UserQueryArgs): Promise<UserDocument | null> => {
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
    { firstName, lastName, email, password }: RegisterArgs
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

      const user = new User({ firstName, lastName, email, password });
      await user.save();
      return { token: generateToken(user), user };
    } catch (error) {
      if (error instanceof GraphQLError) throw error;
      throw new Error(`Error creating user: ${error}`);
    }
  },

  login: async (_: unknown, { email, password }: LoginArgs): Promise<AuthPayload> => {
    try {
      if (!email || !password) throw userInputError('Email and password are required');

      const user = await User.findOne({ email });
      if (!user) throw userInputError('Invalid email or password');

      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) throw userInputError('Invalid email or password');

      return { token: generateToken(user), user };
    } catch (error) {
      if (error instanceof GraphQLError) throw error;
      throw new Error(`Error logging in: ${error}`);
    }
  },

  updateUser: async (
    _: unknown,
    { id, firstName, lastName, email }: UpdateUserArgs
  ): Promise<UserDocument | null> => {
    try {
      const updateData: Partial<Pick<UserDocument, 'firstName' | 'lastName' | 'email'>> = {};
      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;
      if (email) updateData.email = email;
      return await User.findByIdAndUpdate(id, updateData, { new: true });
    } catch (error) {
      throw new Error(`Error updating user: ${error}`);
    }
  },

  deleteUser: async (_: unknown, { id }: UserQueryArgs): Promise<boolean> => {
    try {
      const result = await User.findByIdAndDelete(id);
      return result !== null;
    } catch (error) {
      throw new Error(`Error deleting user: ${error}`);
    }
  },
};
