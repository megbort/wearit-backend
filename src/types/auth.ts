/**
 * Auth Types
 *
 * Types related to authentication tokens.
 */

export type UserRole = 'user' | 'admin';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}
