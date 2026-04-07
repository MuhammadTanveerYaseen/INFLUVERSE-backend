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
const path_1 = __importDefault(require("path"));
// Models
const User_1 = __importDefault(require("../models/User"));
const CreatorProfile_1 = __importDefault(require("../models/CreatorProfile"));
// Load env
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
function cleanup() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log("Connecting to Database...");
            yield mongoose_1.default.connect(process.env.MONGO_URI);
            console.log("Connected Successfully.");
            // Find users starting with creator_swiss_
            const usersToDelete = yield User_1.default.find({ email: { $regex: /^creator_swiss_/ } });
            const userIds = usersToDelete.map(u => u._id);
            if (userIds.length === 0) {
                console.log("No seeded creators found with the 'creator_swiss_' prefix.");
                process.exit(0);
            }
            console.log(`Found ${userIds.length} creators to remove.`);
            // Delete CreatorProfiles
            const profileResult = yield CreatorProfile_1.default.deleteMany({ user: { $in: userIds } });
            console.log(`Deleted ${profileResult.deletedCount} CreatorProfiles.`);
            // Delete Users
            const userResult = yield User_1.default.deleteMany({ _id: { $in: userIds } });
            console.log(`Deleted ${userResult.deletedCount} Users.`);
            console.log("-----------------------------------------");
            console.log("Cleanup complete!");
            console.log("-----------------------------------------");
            process.exit(0);
        }
        catch (error) {
            console.error("Cleanup Error:", error);
            process.exit(1);
        }
    });
}
cleanup();
