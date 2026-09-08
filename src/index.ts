import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';
import { connectDatabase } from './database';
import { Context } from './types';
import { parseAllowedOrigins } from './utils/cors';

const PORT = Number.parseInt(process.env.PORT || '4000', 10);

const allowedOrigins = parseAllowedOrigins(
  process.env.FRONTEND_URL,
  process.env.NODE_ENV,
);

const startServer = async () => {
  try {
    await connectDatabase();

    const server = new ApolloServer<Context>({
      typeDefs,
      resolvers,
      introspection: true,
      csrfPrevention: true,
    });

    await server.start();

    const app = express();

    app.use(
      '/graphql',
      cors({ origin: allowedOrigins, credentials: true }),
      cookieParser(),
      express.json(),
      expressMiddleware(server, {
        context: async ({ req, res }): Promise<Context> => ({ req, res }),
      }),
    );

    app.listen(PORT, () => {
      console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
      console.log(
        `🎯 Apollo Sandbox available at http://localhost:${PORT}/graphql`,
      );
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
};

startServer();
