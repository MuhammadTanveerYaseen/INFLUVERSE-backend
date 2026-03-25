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
exports.OrderService = void 0;
const Order_1 = __importDefault(require("../models/Order"));
const PlatformSettings_1 = __importDefault(require("../models/PlatformSettings"));
class OrderService {
    static createFromOffer(offer) {
        return __awaiter(this, void 0, void 0, function* () {
            // Fetch Platform Fee Configuration
            const settings = yield PlatformSettings_1.default.findOne();
            const feePercentage = (settings === null || settings === void 0 ? void 0 : settings.platformFeePercentage) || 15; // Default 15%
            const offerPrice = Number(offer.price);
            if (isNaN(offerPrice) || offerPrice <= 0) {
                throw new Error(`Invalid offer price: ${offer.price}`);
            }
            // Calculate Platform Fee with precision
            const platformFee = Number((offerPrice * (feePercentage / 100)).toFixed(2));
            const totalAmount = Number((offerPrice + platformFee).toFixed(2));
            const order = yield Order_1.default.create({
                offer: offer._id || offer.id,
                brand: offer.brand,
                creator: offer.creator,
                price: offerPrice,
                platformFee,
                totalAmount,
                status: 'pending_payment',
                paid: false,
                packageDetails: offer.packageDetails
            });
            return order;
        });
    }
    static getOrders(query) {
        return __awaiter(this, void 0, void 0, function* () {
            const orders = yield Order_1.default.find(query)
                .populate('brand', 'username')
                .populate('creator', 'username');
            return orders;
        });
    }
    static getOrderById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const order = yield Order_1.default.findById(id)
                .populate('brand', 'username')
                .populate('creator', 'username');
            return order;
        });
    }
}
exports.OrderService = OrderService;
