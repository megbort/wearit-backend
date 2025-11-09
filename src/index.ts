import { ApolloServer } from 'apollo-server';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';
import { connectDatabase } from './database';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 4000;

const startServer = async () => {
  try {
    await connectDatabase();

    const server = new ApolloServer({
      typeDefs,
      resolvers,
      context: ({ req }) => {
        return { req };
      },
      cors: {
        origin: true,
        credentials: true,
      },
      introspection: true,
    });

    // Start server
    const { url } = await server.listen(PORT);
    console.log(`🚀 Server ready at ${url}`);
    console.log(`🎯 GraphQL Playground available at ${url}`);
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
};

startServer();
