import { User } from './models/User';
import { generateToken, getUserFromToken } from './utils/auth';
import { AuthenticationError, UserInputError } from 'apollo-server';

interface Context {
  req: any;
}

export const resolvers = {
  Query: {
    me: async (_: any, __: any, context: Context) => {
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

    users: async () => {
      try {
        return await User.find({}).sort({ createdAt: -1 });
      } catch (error) {
        throw new Error(`Error fetching users: ${error}`);
      }
    },

    user: async (_: any, { id }: { id: string }) => {
      try {
        return await User.findById(id);
      } catch (error) {
        throw new Error(`Error fetching user: ${error}`);
      }
    },
  },

  Mutation: {
    register: async (
      _: any,
      {
        firstName,
        lastName,
        email,
        password,
      }: {
        firstName: string;
        lastName: string;
        email: string;
        password: string;
      }
    ) => {
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

        if (password.length < 6) {
          throw new UserInputError(
            'Password must be at least 6 characters long'
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
      _: any,
      { email, password }: { email: string; password: string }
    ) => {
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
      _: any,
      {
        id,
        firstName,
        lastName,
        email,
      }: {
        id: string;
        firstName?: string;
        lastName?: string;
        email?: string;
      }
    ) => {
      try {
        const updateData: any = {};
        if (firstName) updateData.firstName = firstName;
        if (lastName) updateData.lastName = lastName;
        if (email) updateData.email = email;

        return await User.findByIdAndUpdate(id, updateData, { new: true });
      } catch (error) {
        throw new Error(`Error updating user: ${error}`);
      }
    },

    deleteUser: async (_: any, { id }: { id: string }) => {
      try {
        const result = await User.findByIdAndDelete(id);
        return result !== null;
      } catch (error) {
        throw new Error(`Error deleting user: ${error}`);
      }
    },
  },
};
