import { Product, ProductDocument } from '../models/Product';
import { requireAdmin } from '../utils/auth';
import { GraphQLError } from 'graphql';
import { userInputError } from '../utils/errors';
import {
  Context,
  CreateProductArgs,
  UpdateProductArgs,
  ProductQueryArgs,
  ProductsByCategoryArgs,
} from '../types';

export const productQueries = {
  products: async (): Promise<ProductDocument[]> => {
    try {
      return await Product.find({}).sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Error fetching products: ${error}`);
    }
  },

  product: async (_: unknown, { id }: ProductQueryArgs): Promise<ProductDocument | null> => {
    try {
      return await Product.findById(id);
    } catch (error) {
      throw new Error(`Error fetching product: ${error}`);
    }
  },

  productsByCategory: async (
    _: unknown,
    { category }: ProductsByCategoryArgs
  ): Promise<ProductDocument[]> => {
    try {
      return await Product.find({ category }).sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Error fetching products by category: ${error}`);
    }
  },

  featuredProducts: async (): Promise<ProductDocument[]> => {
    try {
      return await Product.find({ featured: true }).sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Error fetching featured products: ${error}`);
    }
  },
};

export const productFieldResolvers = {
  effectivePrice: (product: ProductDocument): number => {
    if (product.sale && product.discountPercent > 0) {
      return Number((product.price * (1 - product.discountPercent / 100)).toFixed(2));
    }
    return product.price;
  },
};

export const productMutations = {
  createProduct: async (
    _: unknown,
    args: CreateProductArgs,
    context: Context
  ): Promise<ProductDocument> => {
    requireAdmin(context);

    try {
      const existingProduct = await Product.findOne({ sku: args.sku.toUpperCase() });
      if (existingProduct) {
        throw userInputError(`A product with SKU ${args.sku} already exists`);
      }
      const product = new Product(args);
      return await product.save();
    } catch (error) {
      if (error instanceof GraphQLError) throw error;
      throw new Error(`Error creating product: ${error}`);
    }
  },

  updateProduct: async (
    _: unknown,
    { id, ...updates }: UpdateProductArgs,
    context: Context
  ): Promise<ProductDocument | null> => {
    requireAdmin(context);

    try {
      return await Product.findByIdAndUpdate(id, updates, { new: true });
    } catch (error) {
      throw new Error(`Error updating product: ${error}`);
    }
  },

  deleteProduct: async (
    _: unknown,
    { id }: ProductQueryArgs,
    context: Context
  ): Promise<boolean> => {
    requireAdmin(context);

    try {
      const result = await Product.findByIdAndDelete(id);
      return result !== null;
    } catch (error) {
      throw new Error(`Error deleting product: ${error}`);
    }
  },
};
