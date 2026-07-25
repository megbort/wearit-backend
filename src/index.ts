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

const PORT = Number.parseInt(process.env.PORT || '4000', 10);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const allowedOrigins =
  process.env.NODE_ENV === 'production'
    ? [FRONTEND_URL]
    : [
        FRONTEND_URL,
        'https://studio.apollographql.com',
        'https://sandbox.embed.apollographql.com',
      ];

const startServer = async () => {
  try {
    await connectDatabase();

    const server = new ApolloServer<Context>({
      typeDefs,
      resolvers,
      introspection: true,
      // On by default in Apollo Server v5, but set explicitly: now that a cookie
      // participates in auth, this blocks simple-request CSRF against /graphql.
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
