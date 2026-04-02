import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import path from 'path';

// Models
import User from '../models/User';
import CreatorProfile from '../models/CreatorProfile';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const CATEGORIES = [
    { name: 'Tech & Gadgets', slug: 'tech-gadgets' },
    { name: 'Fashion & Style', slug: 'fashion-style' },
    { name: 'Beauty & Skincare', slug: 'beauty-skincare' },
    { name: 'Food & Dining', slug: 'food-dining' },
    { name: 'Fitness & Wellness', slug: 'fitness-wellness' },
    { name: 'Gaming & Esports', slug: 'gaming-esports' },
    { name: 'Travel & Adventure', slug: 'travel-adventure' },
    { name: 'Home & Living', slug: 'home-living' },
    { name: 'Self Improvement', slug: 'self-improvement' },
    { name: 'Finance & Business', slug: 'finance-business' }
];

const PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'X (Twitter)'];

const UN_IMAGES = [
    "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb",
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d",
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1",
    "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9",
    "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea",
    "https://images.unsplash.com/photo-1521119989659-a83eee488004",
    "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7",
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2",
    "https://images.unsplash.com/photo-1531123897727-8f129e1688ce",
    "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c",
    "https://images.unsplash.com/photo-1554151228-14d9def656e4",
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80",
    "https://images.unsplash.com/photo-1552058544-f2b08422138a",
    "https://images.unsplash.com/photo-1560250097-0b93528c311a",
    "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61"
];

const BIOS: Record<string, string[]> = {
    'Tech & Gadgets': [
        "Unboxing the future one chip at a time. Obsessed with high-performance builds and minimalism.",
        "Your guide to the latest in consumer tech, AI, and smart home automation."
    ],
    'Fashion & Style': [
        "Curating high-end street style and luxury essentials. Making every outfit count.",
        "Sustainable fashion advocate. Helping you build a capsule wardrobe that's both stylish and ethical."
    ],
    'Beauty & Skincare': [
        "Glow from within. Honest reviews for skincare junkies and makeup artists.",
        "Dermatology enthusiast. Science-backed beauty routines for every skin type."
    ],
    'Food & Dining': [
        "Taste-testing my way around the globe. Sharing recipes for the bold and hungry.",
        "Crafting artisanal dishes from simple ingredients. Food for the soul."
    ],
    'Fitness & Wellness': [
        "Transforming lives through functional fitness and mindfulness. Push your limits.",
        "Daily workouts, meal prep tips, and wellness coaching for a holistic lifestyle."
    ],
    'Gaming & Esports': [
        "Grinding to the top of the leaderboards. Strategy games and FPS specialist.",
        "Retro enthusiast and indie game reviewer. Let's talk pixels and mechanics."
    ],
    'Travel & Adventure': [
        "Always on the move. Discovering hidden gems and off-the-beaten-path destinations.",
        "Visual storyteller documenting landscapes and local cultures across 50+ countries."
    ],
    'Home & Living': [
        "Interior design inspiration and home renovation hacks. Creating a sanctuary.",
        "Simplifying life with organizational tips and modern home decor ideas."
    ],
    'Self Improvement': [
        "Personal growth coach. Helping you master your habits and mindset for success.",
        "Lifelong learner sharing insights on productivity, meditation, and leadership."
    ],
    'Finance & Business': [
        "Demystifying markets and venture capital. Tips for early-stage founders and investors.",
        "Crypto enthusiast and personal finance expert. Navigating the new economy."
    ]
};

const NAMES = [
    "Alex Chen", "Sophia Rossi", "Marcus Thorne", "Elena Petrova", "Liam Nakamura",
    "Isabella Garcia", "Noah Schmidt", "Chloe Dubois", "Zane Wright", "Amara Okafor",
    "Oliver Smith", "Mia Lundberg", "Lucas Silva", "Emma Watson", "Jacob Stern",
    "Aria Varma", "Sebastian Kurz", "Lily Evans", "Mateo Rodriguez", "Zoey Miller"
];

async function seed() {
    try {
        console.log("Connecting to Database...");
        await mongoose.connect(process.env.MONGO_URI!);
        console.log("Connected Successfully.");

        // Clear existing test creators (Optional but recommended for clean seed)
        // const existingUsers = await User.find({ email: /test_creator/ });
        // const ids = existingUsers.map(u => u._id);
        // await User.deleteMany({ _id: { $in: ids } });
        // await CreatorProfile.deleteMany({ user: { $in: ids } });
        // console.log("Cleared existing test creators.");

        const creatorCount = 20;
        const password = await bcrypt.hash('password123', 10);

        for (let i = 0; i < creatorCount; i++) {
            const name = NAMES[i];
            const username = name.toLowerCase().replace(' ', '_') + '_' + Math.floor(Math.random() * 100);
            const email = `creator_${i + 1}@influverse.ch`;
            const categoryIndex = Math.floor(i / 2);
            const category = CATEGORIES[categoryIndex];
            const bio = BIOS[category.name][i % 2];

            console.log(`Seeding: ${name} [${category.name}]`);

            // 1. Create User
            const user = await User.create({
                name,
                username,
                email,
                password,
                role: 'creator',
                status: 'active',
                isVerified: true
            });

            // 2. Randomize Platforms
            const selectedPlatforms = PLATFORMS.slice(0, 1 + Math.floor(Math.random() * 3)).map(p => ({
                name: p,
                handle: `@${username}`,
                url: `https://${p.toLowerCase()}.com/${username}`,
                followers: `${(10 + Math.floor(Math.random() * 900))}K`,
                avatar: UN_IMAGES[i]
            }));

            // 3. Randomize Packages
            const packages = [
                {
                    name: 'Essential Spark',
                    description: 'One high-quality piece of content (Short video or static post) tailored to your brand goals.',
                    price: 250 + (Math.floor(Math.random() * 10) * 50),
                    revisions: 1,
                    features: ['Category Research', 'Color Grading', 'Brand Tagging']
                },
                {
                    name: 'Strategic Reach',
                    description: 'Three strategic content pieces + social media shoutout on chosen platform.',
                    price: 600 + (Math.floor(Math.random() * 15) * 50),
                    revisions: 2,
                    features: ['Audience Analysis', 'Extended Usage Rights', 'Source Files Provided']
                },
                {
                    name: 'Brand Partnership',
                    description: 'Complete campaign package including 5 content assets, story sequences, and deep collaboration.',
                    price: 1500 + (Math.floor(Math.random() * 30) * 100),
                    revisions: 3,
                    features: ['Dedicated Support', 'Exclusive Distribution', 'Performance Tracking']
                }
            ];

            // 4. Create Creator Profile
            await CreatorProfile.create({
                user: user._id,
                profileImage: UN_IMAGES[i],
                coverImage: `https://images.unsplash.com/photo-${1500000000000 + i}`, // Semi-random cover
                bio,
                categories: [category.name],
                country: ['USA', 'UK', 'Germany', 'Switzerland', 'France', 'Canada', 'Australia'][Math.floor(Math.random() * 7)],
                languages: ['English', 'German', 'French'][Math.floor(Math.random() * 3)] === 'English' ? ['English'] : ['English', 'German'],
                platforms: selectedPlatforms,
                portfolio: [
                    `https://images.unsplash.com/photo-${1600000000000 + (i * 10)}`,
                    `https://images.unsplash.com/photo-${1600000000000 + (i * 20)}`,
                    `https://images.unsplash.com/photo-${1600000000000 + (i * 30)}`
                ],
                packages,
                stats: {
                    followerCount: (50 + Math.floor(Math.random() * 500)) * 1000,
                    engagementRate: parseFloat((1.5 + Math.random() * 6).toFixed(1)),
                    completedOrders: Math.floor(Math.random() * 150),
                    rating: parseFloat((4.2 + Math.random() * 0.8).toFixed(1)),
                    reviewCount: Math.floor(Math.random() * 60)
                },
                verified: true,
                isFeatured: i < 5, // First 5 are featured
                availability: 'available'
            });
        }

        console.log("-----------------------------------------");
        console.log(`Successfully seeded ${creatorCount} creators!`);
        console.log("-----------------------------------------");
        process.exit(0);
    } catch (error) {
        console.error("Critical Seeding Error:", error);
        process.exit(1);
    }
}

seed();
