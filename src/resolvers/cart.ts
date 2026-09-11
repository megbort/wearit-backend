import mongoose from 'mongoose';
import { User, CartItem } from '../models/User';
import { Product, ProductDocument } from '../models/Product';
import { requireAuth } from '../utils/auth';
import { userInputError } from '../utils/errors';
import { Context, AddToCartArgs, UpdateCartItemArgs, RemoveFromCartArgs } from '../types';

export const cartItemFieldResolvers = {
  // TODO: N+1 — one Product.findById per cart item. Batch via DataLoader
  // (Product.find({ _id: { $in: [...] } })) once cart sizes/traffic grow.
  product: async (parent: CartItem): Promise<ProductDocument | null> => {
    return Product.findById(parent.productId);
  },
};

const pullCartItem = async (
  userId: string,
  productId: string,
  size: string,
  color: string
): Promise<CartItem[]> => {
  const updated = await User.findByIdAndUpdate(
    userId,
    { $pull: { cart: { productId, size, color } } },
    { new: true }
  );
  if (!updated) throw userInputError('User not found');
  return updated.cart;
};

export const cartMutations = {
  addToCart: async (
    _: unknown,
    { productId, size, color, quantity = 1 }: AddToCartArgs,
    context: Context
  ): Promise<CartItem[]> => {
    const authUser = requireAuth(context);

    const product = await Product.findById(productId);
    if (!product) throw userInputError('Product not found');
    if (!product.sizes.includes(size) || !product.colors.includes(color)) {
      throw userInputError('Product does not offer the requested size/color');
    }

    // Increment-or-push is two separate atomic ops, not one transaction: two
    // concurrent first-adds of the same brand-new variant can each miss the
    // $inc match and both fall through to $push, producing duplicate lines.
    // Acceptable for now — a real fix needs a session transaction.
    const incremented = await User.findOneAndUpdate(
      {
        _id: authUser.userId,
        cart: { $elemMatch: { productId, size, color } },
      },
      { $inc: { 'cart.$.quantity': quantity } },
      { new: true }
    );

    if (incremented) return incremented.cart;

    const pushed = await User.findByIdAndUpdate(
      authUser.userId,
      {
        $push: {
          cart: { productId: new mongoose.Types.ObjectId(productId), size, color, quantity },
        },
      },
      { new: true }
    );

    if (!pushed) throw userInputError('User not found');
    return pushed.cart;
  },

  updateCartItem: async (
    _: unknown,
    { productId, size, color, quantity }: UpdateCartItemArgs,
    context: Context
  ): Promise<CartItem[]> => {
    const authUser = requireAuth(context);

    if (quantity <= 0) {
      return pullCartItem(authUser.userId, productId, size, color);
    }

    const updated = await User.findOneAndUpdate(
      {
        _id: authUser.userId,
        cart: { $elemMatch: { productId, size, color } },
      },
      { $set: { 'cart.$.quantity': quantity } },
      { new: true }
    );

    if (updated) return updated.cart;

    const userExists = await User.exists({ _id: authUser.userId });
    if (!userExists) throw userInputError('User not found');
    throw userInputError('Item not found in cart');
  },

  removeFromCart: async (
    _: unknown,
    { productId, size, color }: RemoveFromCartArgs,
    context: Context
  ): Promise<CartItem[]> => {
    const authUser = requireAuth(context);
    return pullCartItem(authUser.userId, productId, size, color);
  },

  clearCart: async (_: unknown, __: unknown, context: Context): Promise<boolean> => {
    const authUser = requireAuth(context);
    const updated = await User.findByIdAndUpdate(authUser.userId, { cart: [] });
    if (!updated) throw userInputError('User not found');
    return true;
  },
};
