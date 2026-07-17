import { GraphQLError } from 'graphql';

export const authenticationError = (message: string): GraphQLError =>
  new GraphQLError(message, { extensions: { code: 'UNAUTHENTICATED' } });

export const userInputError = (message: string): GraphQLError =>
  new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
