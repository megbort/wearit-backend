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

// Product Arguments
export type CategoryType = 'pants' | 'tees' | 'sweaters' | 'shorts' | 'jackets';

export interface CreateProductArgs {
  sku: string;
  name: string;
  price: number;
  images: string[];
  colors: string[];
  sizes: string[];
  details: string[];
  featured?: boolean;
  sale?: boolean;
  category: CategoryType;
}

export interface UpdateProductArgs {
  id: string;
  name?: string;
  price?: number;
  images?: string[];
  colors?: string[];
  sizes?: string[];
  details?: string[];
  featured?: boolean;
  sale?: boolean;
  category?: CategoryType;
}

export interface ProductQueryArgs {
  id: string;
}

export interface ProductsByCategoryArgs {
  category: CategoryType;
}
