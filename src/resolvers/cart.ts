import mongoose from 'mongoose';
import { User, CartItem } from '../models/User';
import { getUserFromToken } from '../utils/auth';
import { GraphQLError } from 'graphql';
import { authenticationError, userInputError } from '../utils/errors';
import { Context, AddToCartArgs, UpdateCartItemArgs, RemoveFromCartArgs } from '../types';

export const cartMutations = {
  addToCart: async (
    _: unknown,
    { productId, size, color, quantity = 1 }: AddToCartArgs,
    context: Context
  ): Promise<CartItem[]> => {
    const authUser = getUserFromToken(context.req.headers.authorization);
    if (!authUser) throw authenticationError('You must be logged in');

    try {
      const user = await User.findById(authUser.userId);
      if (!user) throw new Error('User not found');

      const existing = user.cart.find(
        (item) =>
          item.productId.toString() === productId &&
          item.size === size &&
          item.color === color
      );

      if (existing) {
        existing.quantity += quantity;
      } else {
        user.cart.push({
          productId: new mongoose.Types.ObjectId(productId),
          size,
          color,
          quantity,
        });
      }

      await user.save();
      return user.cart;
    } catch (error) {
      throw new Error(`Error adding to cart: ${error}`);
    }
  },

  updateCartItem: async (
    _: unknown,
    { productId, size, color, quantity }: UpdateCartItemArgs,
    context: Context
  ): Promise<CartItem[]> => {
    const authUser = getUserFromToken(context.req.headers.authorization);
    if (!authUser) throw authenticationError('You must be logged in');

    try {
      const user = await User.findById(authUser.userId);
      if (!user) throw new Error('User not found');

      const item = user.cart.find(
        (i) =>
          i.productId.toString() === productId && i.size === size && i.color === color
      );

      if (!item) throw userInputError('Item not found in cart');

      item.quantity = quantity;
      await user.save();
      return user.cart;
    } catch (error) {
      if (error instanceof GraphQLError) throw error;
      throw new Error(`Error updating cart item: ${error}`);
    }
  },

  removeFromCart: async (
    _: unknown,
    { productId, size, color }: RemoveFromCartArgs,
    context: Context
  ): Promise<CartItem[]> => {
    const authUser = getUserFromToken(context.req.headers.authorization);
    if (!authUser) throw authenticationError('You must be logged in');

    try {
      const user = await User.findById(authUser.userId);
      if (!user) throw new Error('User not found');

      user.cart = user.cart.filter(
        (item) =>
          !(
            item.productId.toString() === productId &&
            item.size === size &&
            item.color === color
          )
      );

      await user.save();
      return user.cart;
    } catch (error) {
      throw new Error(`Error removing from cart: ${error}`);
    }
  },

  clearCart: async (_: unknown, __: unknown, context: Context): Promise<boolean> => {
    const authUser = getUserFromToken(context.req.headers.authorization);
    if (!authUser) throw authenticationError('You must be logged in');

    try {
      await User.findByIdAndUpdate(authUser.userId, { cart: [] });
      return true;
    } catch (error) {
      throw new Error(`Error clearing cart: ${error}`);
    }
  },
};
