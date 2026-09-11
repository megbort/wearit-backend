import mongoose, { Document, Schema } from 'mongoose';

export type CategoryType = 'pants' | 'tees' | 'sweaters' | 'shorts' | 'jackets';

export interface ProductDocument extends Document {
  sku: string;
  name: string;
  price: number;
  images: string[];
  colors: string[];
  sizes: string[];
  details: string[];
  featured: boolean;
  discountPercent: number;
  category: CategoryType;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema: Schema = new Schema(
  {
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    images: {
      type: [String],
      default: [],
    },
    colors: {
      type: [String],
      default: [],
    },
    sizes: {
      type: [String],
      default: [],
    },
    details: {
      type: [String],
      default: [],
    },
    featured: {
      type: Boolean,
      default: false,
    },
    discountPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    category: {
      type: String,
      required: true,
      enum: ['pants', 'tees', 'sweaters', 'shorts', 'jackets'],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Product = mongoose.model<ProductDocument>('Product', ProductSchema);
