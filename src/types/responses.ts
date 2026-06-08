/**
 * GraphQL Response Types
 *
 * Return type definitions for GraphQL resolvers, representing the structure
 * of data returned from mutations and queries.
 */

import { UserDocument } from '../models/User';

// Authentication Response Types
export interface AuthPayload {
  token: string;
  user: UserDocument;
}
