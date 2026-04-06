import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Models
import User from '../models/User';
import CreatorProfile from '../models/CreatorProfile';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function cleanup() {
    try {
        console.log("Connecting to Database...");
        await mongoose.connect(process.env.MONGO_URI!);
        console.log("Connected Successfully.");

        // Find users starting with creator_swiss_
        const usersToDelete = await User.find({ email: { $regex: /^creator_swiss_/ } });
        const userIds = usersToDelete.map(u => u._id);

        if (userIds.length === 0) {
            console.log("No seeded creators found with the 'creator_swiss_' prefix.");
            process.exit(0);
        }

        console.log(`Found ${userIds.length} creators to remove.`);

        // Delete CreatorProfiles
        const profileResult = await CreatorProfile.deleteMany({ user: { $in: userIds } });
        console.log(`Deleted ${profileResult.deletedCount} CreatorProfiles.`);

        // Delete Users
        const userResult = await User.deleteMany({ _id: { $in: userIds } });
        console.log(`Deleted ${userResult.deletedCount} Users.`);

        console.log("-----------------------------------------");
        console.log("Cleanup complete!");
        console.log("-----------------------------------------");
        process.exit(0);
    } catch (error) {
        console.error("Cleanup Error:", error);
        process.exit(1);
    }
}

cleanup();
