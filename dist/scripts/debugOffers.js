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
const path_1 = __importDefault(require("path"));
// Load env vars
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const checkOffers = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        console.log("Connecting to MongoDB...");
        yield mongoose_1.default.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");
        const Offer = (yield Promise.resolve().then(() => __importStar(require('../models/Offer')))).default;
        const User = (yield Promise.resolve().then(() => __importStar(require('../models/User')))).default;
        console.log("\n--- Checking Offers ---");
        const offers = yield Offer.find({}).populate('creator', 'username email').populate('brand', 'username email').lean();
        console.log(`Found ${offers.length} offers total.`);
        for (const offer of offers) {
            console.log(`\nOffer ID: ${offer._id}`);
            console.log(`- Status: ${offer.status}`);
            console.log(`- Brand: ${(_a = offer.brand) === null || _a === void 0 ? void 0 : _a.username} (${(_b = offer.brand) === null || _b === void 0 ? void 0 : _b._id})`);
            console.log(`- Creator: ${(_c = offer.creator) === null || _c === void 0 ? void 0 : _c.username} (${(_d = offer.creator) === null || _d === void 0 ? void 0 : _d._id})`);
            console.log(`- Raw Creator ID stored: ${offer.creator}`);
            // Check if creator exists in User collection
            const creatorUser = yield User.findById(offer.creator);
            if (creatorUser) {
                console.log(`  -> Creator User found: ${creatorUser.username}, Role: ${creatorUser.role}`);
            }
            else {
                console.log(`  -> ERROR: Creator User NOT found for ID: ${offer.creator}`);
            }
        }
    }
    catch (error) {
        console.error("Error:", error);
    }
    finally {
        yield mongoose_1.default.connection.close();
        console.log("\nDatabase connection closed.");
    }
});
checkOffers();
