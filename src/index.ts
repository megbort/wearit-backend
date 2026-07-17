import dotenv from 'dotenv';
dotenv.config();

import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';
import { connectDatabase } from './database';
import { Context } from './types';

const PORT = parseInt(process.env.PORT || '4000', 10);

const startServer = async () => {
  try {
    await connectDatabase();

    const server = new ApolloServer<Context>({
      typeDefs,
      resolvers,
      introspection: true,
    });

    // Start server
    const { url } = await startStandaloneServer(server, {
      context: async ({ req }) => ({ req }),
      listen: { port: PORT },
    });
    console.log(`🚀 Server ready at ${url}`);
    console.log(`🎯 Apollo Sandbox available at ${url}`);
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
};

startServer();
