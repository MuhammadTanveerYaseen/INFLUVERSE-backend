import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/influverse_api');
        console.log(`MongoDB Connected (API): ${conn.connection.host}`);
    } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;
