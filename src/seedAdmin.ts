
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './config/db';
import User from './models/User';

dotenv.config();

const seedAdmin = async () => {
    try {
        await connectDB();

        const adminExists = await User.findOne({ email: 'admin@influverse.com' });

        if (adminExists) {
            console.log('Admin user already exists');
            process.exit();
        }

        const admin = await User.create({
            username: 'admin',
            email: 'admin@influverse.com',
            password: 'adminpassword123',
            role: 'admin',
        });

        console.log('Admin user created successfully');
        console.log('Email: admin@influverse.com');
        console.log('Password: adminpassword123');

        process.exit();
    } catch (error) {
        console.error('Error seeding admin:', error);
        process.exit(1);
    }
};

seedAdmin();
