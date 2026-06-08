import { userQueries, userMutations } from './user';
import { productQueries, productMutations } from './product';
import { cartMutations } from './cart';

export const resolvers = {
  Query: {
    ...userQueries,
    ...productQueries,
  },
  Mutation: {
    ...userMutations,
    ...productMutations,
    ...cartMutations,
  },
};
