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
exports.getActionsCount = void 0;
const Offer_1 = __importDefault(require("../models/Offer"));
const Order_1 = __importDefault(require("../models/Order"));
const mongoose_1 = __importDefault(require("mongoose"));
const getActionsCount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = (req.user._id || req.user.id).toString();
        const role = req.user.role;
        const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
        let offerCount = 0;
        let orderCount = 0;
        if (role === 'brand') {
            [offerCount, orderCount] = yield Promise.all([
                Offer_1.default.countDocuments({
                    brand: userObjectId,
                    $or: [
                        { status: 'pending', sender: { $ne: userObjectId } },
                        { status: 'countered', sender: userObjectId }
                    ]
                }),
                Order_1.default.countDocuments({
                    brand: userObjectId,
                    status: { $in: ['pending_payment', 'delivered'] }
                })
            ]);
        }
        else if (role === 'creator') {
            [offerCount, orderCount] = yield Promise.all([
                Offer_1.default.countDocuments({
                    creator: userObjectId,
                    $or: [
                        { status: 'pending', sender: { $ne: userObjectId } },
                        { status: 'countered', sender: userObjectId }
                    ]
                }),
                Order_1.default.countDocuments({
                    creator: userObjectId,
                    status: { $in: ['active', 'revision', 'pending_payment'] }
                })
            ]);
        }
        res.json({
            offers: offerCount,
            orders: orderCount
        });
    }
    catch (error) {
        console.error("Error fetching actions count:", error);
        res.status(500).json({ message: "Failed to fetch actions count" });
    }
});
exports.getActionsCount = getActionsCount;
