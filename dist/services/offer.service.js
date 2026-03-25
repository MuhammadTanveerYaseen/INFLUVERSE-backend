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
exports.OfferService = void 0;
const Offer_1 = __importDefault(require("../models/Offer"));
class OfferService {
    static createOffer(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const offer = yield Offer_1.default.create(data);
            return offer;
        });
    }
    static getOfferById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const offer = yield Offer_1.default.findById(id);
            return offer;
        });
    }
    static getOffers(query) {
        return __awaiter(this, void 0, void 0, function* () {
            const offers = yield Offer_1.default.find(query)
                .populate('brand', 'username')
                .populate('creator', 'username')
                .populate('order');
            return offers;
        });
    }
    static updateOfferStatus(offerId, status, counterData) {
        return __awaiter(this, void 0, void 0, function* () {
            const offer = yield Offer_1.default.findById(offerId);
            if (!offer) {
                throw new Error('Offer not found');
            }
            offer.status = status;
            if (status === 'countered') {
                if (!counterData)
                    throw new Error('Counter offer data required');
                offer.counterOffer = counterData;
            }
            const updatedOffer = yield offer.save();
            return updatedOffer;
        });
    }
}
exports.OfferService = OfferService;
