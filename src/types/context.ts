/**
 * GraphQL Context Types
 *
 * Context object types passed to GraphQL resolvers containing request data,
 * authentication info, and other shared resolver dependencies.
 */

import { Request, Response } from 'express';

export interface Context {
  req: Request;
  res: Response;
}
