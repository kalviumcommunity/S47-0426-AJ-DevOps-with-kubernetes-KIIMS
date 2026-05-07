import mongoose from 'mongoose';

/**
 * Establishes a connection to MongoDB using the URI from application config.
 * Logs success on connection and re-throws any errors after logging them.
 */
export async function connectDB(): Promise<void> {
  const mongodbUri = process.env.MONGODB_URI;

  if (!mongodbUri) {
    throw new Error('MONGODB_URI is required to connect to MongoDB');
  }

  try {
    await mongoose.connect(mongodbUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

/**
 * Closes the MongoDB connection. Useful for test teardown.
 */
export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}

/**
 * Returns true when Mongoose has an active connection to MongoDB.
 */
export function isConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
