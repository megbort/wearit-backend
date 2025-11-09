import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

enum ExitCode {
  SUCCESS = 0,
  FAILURE = 1,
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

export const connectDatabase = async () => {
  try {
    const conn = await mongoose.connect(MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(ExitCode.FAILURE);
  }
};

export { default } from 'mongoose';
