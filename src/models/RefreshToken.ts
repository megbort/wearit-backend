import mongoose, { Document, Schema } from 'mongoose';

export interface RefreshTokenDocument extends Document {
  tokenHash: string;
  userId: mongoose.Types.ObjectId;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RefreshTokenSchema: Schema = new Schema(
  {
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// MongoDB TTL index: expired tokens are deleted automatically
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = mongoose.model<RefreshTokenDocument>(
  'RefreshToken',
  RefreshTokenSchema
);
