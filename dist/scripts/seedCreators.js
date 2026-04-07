"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const path_1 = __importDefault(require("path"));
// Models
const User_1 = __importDefault(require("../models/User"));
const CreatorProfile_1 = __importDefault(require("../models/CreatorProfile"));
// Load env
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
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
// Consistent high-quality images for all creators as per "should be same" instruction
const PROFILE_IMAGE = "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=800";
const BANNER_IMAGE = "https://images.unsplash.com/photo-1472289065668-ce650ac443d2?auto=format&fit=crop&q=80&w=1200";
const PORTFOLIO_IMAGES = [
    "https://images.unsplash.com/photo-1492724441997-5dc865305da7?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800"
];
const BIOS_DE = {
    'Tech & Gadgets': [
        "Ich liebe die neueste Technik und Gadgets. Auf meinem Kanal findest du Reviews zu Smartphones, Laptops und Smart Home.",
        "Technik-Enthusiast mit Fokus auf Innovation und Design. Ich teste das Neueste vom Neuen für dich."
    ],
    'Fashion & Style': [
        "Mode ist meine Leidenschaft. Ich teile tägliche Outfits, Trends und Tipps für deinen persönlichen Stil.",
        "Minimalistischer Stil und zeitlose Mode. Ich zeige dir, wie du mit wenig viel erreichen kannst."
    ],
    'Beauty & Skincare': [
        "Alles rund um Hautpflege und Make-up. Erfahre mehr über meine tägliche Routine und ehrliche Produktbewertungen.",
        "Dein Guide für natürliche Schönheit und effektive Hautpflege-Tipps."
    ],
    'Food & Dining': [
        "Leidenschaftlicher Hobbykoch und Foodie. Ich teile meine Lieblingsrezepte und die besten Restaurants.",
        "Kulinarische Entdeckungsreisen und einfache Rezepte für den Alltag. Essen ist Leben!"
    ],
    'Fitness & Wellness': [
        "Gemeinsam zu deiner Bestform. Workouts, Ernährungstipps und Motivation für ein gesundes Leben.",
        "Yoga, Achtsamkeit und körperliche Fitness. Ich helfe dir dabei, dein Wohlbefinden zu steigern."
    ],
    'Gaming & Esports': [
        "Passionierter Gamer und Streamer. Live-Action, Walkthroughs und alles rund um das Thema Gaming.",
        "E-Sports News und Technik-Gaming-Reviews. Tauche mit mir ein in die Welt der Pixel."
    ],
    'Travel & Adventure': [
        "Reisen ist meine Art zu leben. Ich entdecke für dich die schönsten Orte der Welt und teile meine Abenteuer.",
        "Abenteuerlustig und immer auf der Suche nach dem nächsten Ziel. Reise-Vlogs und Tipps."
    ],
    'Home & Living': [
        "Inspiration für dein Zuhause. DIY-Projekte, Interior Design und Tipps für ein gemütliches Heim.",
        "Schöner Wohnen leicht gemacht. Ich zeige dir kreative Ideen für deine Inneneinrichtung."
    ],
    'Self Improvement': [
        "Werde die beste Version deiner selbst. Tipps für Produktivität, Motivation und persönliches Wachstum.",
        "Mindset-Coaching und Lebensberatung für mehr Erfolg und Zufriedenheit im Alltag."
    ],
    'Finance & Business': [
        "Finanzen einfach erklärt. Tipps zum Investieren, Sparen und zum Thema Unternehmertum.",
        "Business-Insights und Finanzstrategien für junge Gründer und Investoren."
    ]
};
const SWISS_NAMES = [
    "Noah Kaufmann", "Leonie Müller", "Luca Schneider", "Mia Fischer", "Elias Weber",
    "Elena Meyer", "Matteo Wagner", "Lara Becker", "Julian Schulz", "Emilia Hoffmann",
    "Jonas Schäfer", "Sophie Koch", "Nico Bauer", "Anna Richter", "Marco Klein",
    "Laura Wolf", "David Schröder", "Julia Neumann", "Fabio Schwarz", "Sara Zimmermann"
];
const COUNTRIES = ['Schweiz', 'Deutschland', 'Österreich'];
function seed() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log("Connecting to Database...");
            yield mongoose_1.default.connect(process.env.MONGO_URI);
            console.log("Connected Successfully.");
            const creatorCount = 20;
            const password = yield bcryptjs_1.default.hash('password123', 10);
            for (let i = 0; i < creatorCount; i++) {
                const name = SWISS_NAMES[i];
                const username = name.toLowerCase().replace(' ', '_') + '_' + Math.floor(Math.random() * 100);
                const email = `creator_swiss_${i + 1}@influverse.ch`;
                // Randomly select 2 or 3 categories
                const numCategories = 2 + Math.floor(Math.random() * 2); // 2 or 3
                const shuffledCats = [...CATEGORIES].sort(() => 0.5 - Math.random());
                const selectedCats = shuffledCats.slice(0, numCategories);
                // Get bio from the first primary category
                const primaryCat = selectedCats[0].name;
                const bio = BIOS_DE[primaryCat][i % 2];
                console.log(`Seeding: ${name} [${selectedCats.map(c => c.name).join(', ')}]`);
                // 1. Create User
                const user = yield User_1.default.create({
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
                    avatar: PROFILE_IMAGE
                }));
                // 3. German Packages
                const packages = [
                    {
                        name: 'Essential Spark',
                        description: 'Ein hochwertiges Content-Piece (Short Video oder statischer Post), das auf Ihre Markenziele zugeschnitten ist.',
                        price: 250 + (Math.floor(Math.random() * 10) * 50),
                        revisions: 1,
                        features: ['Zielgruppen-Recherche', 'Farbkorrektur', 'Marken-Tagging']
                    },
                    {
                        name: 'Strategic Reach',
                        description: 'Drei strategische Content-Elemente + Social Media Shoutout auf der gewählten Plattform.',
                        price: 600 + (Math.floor(Math.random() * 15) * 50),
                        revisions: 2,
                        features: ['Zielgruppen-Analyse', 'Erweiterte Nutzungsrechte', 'Quelldateien enthalten']
                    },
                    {
                        name: 'Brand Partnership',
                        description: 'Komplettes Kampagnenpaket mit 5 Content-Assets, Story-Sequenzen und enger Zusammenarbeit.',
                        price: 1500 + (Math.floor(Math.random() * 30) * 100),
                        revisions: 3,
                        features: ['Dedizierter Support', 'Exklusive Distribution', 'Performance-Tracking']
                    }
                ];
                // 4. Create Creator Profile
                yield CreatorProfile_1.default.create({
                    user: user._id,
                    profileImage: PROFILE_IMAGE,
                    coverImage: BANNER_IMAGE,
                    bio,
                    categories: selectedCats.map(c => c.name),
                    country: COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)],
                    languages: ['Deutsch', 'Englisch'],
                    platforms: selectedPlatforms,
                    portfolio: PORTFOLIO_IMAGES,
                    packages,
                    stats: {
                        followerCount: (50 + Math.floor(Math.random() * 500)) * 1000,
                        engagementRate: parseFloat((1.5 + Math.random() * 6).toFixed(1)),
                        completedOrders: Math.floor(Math.random() * 150),
                        rating: parseFloat((4.2 + Math.random() * 0.8).toFixed(1)),
                        reviewCount: Math.floor(Math.random() * 60)
                    },
                    verified: true,
                    isFeatured: i < 5,
                    availability: 'available'
                });
            }
            console.log("-----------------------------------------");
            console.log(`Successfully seeded ${creatorCount} Swiss creators!`);
            console.log("-----------------------------------------");
            process.exit(0);
        }
        catch (error) {
            console.error("Critical Seeding Error:", error);
            process.exit(1);
        }
    });
}
seed();
