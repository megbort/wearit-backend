/**
 * GraphQL Context Types
 *
 * Context object types passed to GraphQL resolvers containing request data,
 * authentication info, and other shared resolver dependencies.
 */

export interface Context {
  req: {
    headers: {
      authorization?: string;
    };
  };
}
