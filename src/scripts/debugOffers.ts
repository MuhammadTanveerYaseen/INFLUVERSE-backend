
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const checkOffers = async () => {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI as string);
        console.log("Connected to MongoDB");

        const Offer = (await import('../models/Offer')).default;
        const User = (await import('../models/User')).default;

        console.log("\n--- Checking Offers ---");
        const offers = await Offer.find({}).populate('creator', 'username email').populate('brand', 'username email').lean();
        console.log(`Found ${offers.length} offers total.`);

        for (const offer of (offers as any[])) {
            console.log(`\nOffer ID: ${offer._id}`);
            console.log(`- Status: ${offer.status}`);
            console.log(`- Brand: ${offer.brand?.username} (${offer.brand?._id})`);
            console.log(`- Creator: ${offer.creator?.username} (${offer.creator?._id})`);
            console.log(`- Raw Creator ID stored: ${offer.creator}`);

            // Check if creator exists in User collection
            const creatorUser = await User.findById(offer.creator);
            if (creatorUser) {
                console.log(`  -> Creator User found: ${creatorUser.username}, Role: ${creatorUser.role}`);
            } else {
                console.log(`  -> ERROR: Creator User NOT found for ID: ${offer.creator}`);
            }
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.connection.close();
        console.log("\nDatabase connection closed.");
    }
};

checkOffers();
