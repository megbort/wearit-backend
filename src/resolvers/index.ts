import { userQueries, userMutations } from './user';
import { productQueries, productMutations, productFieldResolvers } from './product';
import { cartMutations, cartItemFieldResolvers } from './cart';

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
  Product: productFieldResolvers,
  CartItem: cartItemFieldResolvers,
};
