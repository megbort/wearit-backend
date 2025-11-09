import { User, IUser } from './models/User';
import { generateToken, getUserFromToken } from './utils/auth';
import { AuthenticationError, UserInputError } from 'apollo-server';
import {
  Context,
  RegisterArgs,
  LoginArgs,
  UpdateUserArgs,
  UserQueryArgs,
  AuthPayload,
} from './types';

// Constants
const MIN_PASSWORD_LENGTH = 6;

export const resolvers = {
  Query: {
    me: async (
      _: unknown,
      __: unknown,
      context: Context
    ): Promise<IUser | null> => {
      const authUser = getUserFromToken(context.req.headers.authorization);
      if (!authUser) {
        throw new AuthenticationError('You must be logged in to access this');
      }

      try {
        return await User.findById(authUser.userId);
      } catch (error) {
        throw new Error(`Error fetching user: ${error}`);
      }
    },

    users: async (): Promise<IUser[]> => {
      try {
        return await User.find({}).sort({ createdAt: -1 });
      } catch (error) {
        throw new Error(`Error fetching users: ${error}`);
      }
    },

    user: async (_: unknown, { id }: UserQueryArgs): Promise<IUser | null> => {
      try {
        return await User.findById(id);
      } catch (error) {
        throw new Error(`Error fetching user: ${error}`);
      }
    },
  },

  Mutation: {
    register: async (
      _: unknown,
      { firstName, lastName, email, password }: RegisterArgs
    ): Promise<AuthPayload> => {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          throw new UserInputError('A user with this email already exists');
        }

        // Validate input
        if (!firstName || !lastName || !email || !password) {
          throw new UserInputError('All fields are required');
        }

        if (password.length < MIN_PASSWORD_LENGTH) {
          throw new UserInputError(
            `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`
          );
        }

        // Create new user
        const user = new User({ firstName, lastName, email, password });
        await user.save();

        const token = generateToken(user);

        return {
          token,
          user,
        };
      } catch (error) {
        if (error instanceof UserInputError) {
          throw error;
        }
        throw new Error(`Error creating user: ${error}`);
      }
    },

    login: async (
      _: unknown,
      { email, password }: LoginArgs
    ): Promise<AuthPayload> => {
      try {
        // Validate input
        if (!email || !password) {
          throw new UserInputError('Email and password are required');
        }

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
          throw new UserInputError('Invalid email or password');
        }

        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
          throw new UserInputError('Invalid email or password');
        }

        const token = generateToken(user);

        return {
          token,
          user,
        };
      } catch (error) {
        if (error instanceof UserInputError) {
          throw error;
        }
        throw new Error(`Error logging in: ${error}`);
      }
    },

    updateUser: async (
      _: unknown,
      { id, firstName, lastName, email }: UpdateUserArgs
    ): Promise<IUser | null> => {
      try {
        const updateData: Partial<
          Pick<IUser, 'firstName' | 'lastName' | 'email'>
        > = {};
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
  },
};
