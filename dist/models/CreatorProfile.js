"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const addOnSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String }
});
const packageSchema = new mongoose_1.Schema({
    name: { type: String, required: true }, // e.g., 'Basic', 'Standard'
    price: { type: Number, required: true },
    description: { type: String }, // Describes deliverables
    revisions: { type: Number, default: 1 },
    features: [String],
    addOns: [addOnSchema]
});
const platformSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    handle: { type: String, required: true },
    url: { type: String },
    followers: { type: String },
    avatar: { type: String }
});
const creatorProfileSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    profileImage: { type: String },
    coverImage: { type: String },
    bio: { type: String },
    categories: [String],
    country: { type: String },
    languages: [String],
    platforms: [platformSchema],
    portfolio: [String],
    packages: [packageSchema],
    // addOns: [addOnSchema],
    stats: {
        followerCount: { type: Number, default: 0 },
        engagementRate: { type: Number, default: 0 },
        completedOrders: { type: Number, default: 0 },
        rating: { type: Number, default: 0 },
        reviewCount: { type: Number, default: 0 }
    },
    verified: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    availability: {
        type: String,
        enum: ['available', 'busy', 'offline'],
        default: 'available'
    },
    phoneNumber: { type: String },
    stripeConnectId: { type: String },
    bankDetails: {
        bankName: { type: String },
        accountHolderName: { type: String },
        accountNumber: { type: String },
        routingNumber: { type: String },
        swiftCode: { type: String }
    }
}, {
    timestamps: true
});
exports.default = mongoose_1.default.model('CreatorProfile', creatorProfileSchema);
