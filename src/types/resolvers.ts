/**
 * GraphQL Resolver Argument Types
 *
 * Input argument types for GraphQL resolvers, representing the structure
 * of data passed to mutations and queries.
 */

// User Authentication Arguments
export interface RegisterArgs {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface LoginArgs {
  email: string;
  password: string;
}

// User Management Arguments
export interface UpdateUserArgs {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface UserQueryArgs {
  id: string;
}
