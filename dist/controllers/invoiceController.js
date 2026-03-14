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
exports.downloadInvoice = void 0;
const Order_1 = __importDefault(require("../models/Order"));
const User_1 = __importDefault(require("../models/User"));
const BrandProfile_1 = __importDefault(require("../models/BrandProfile"));
const invoiceGenerator_1 = require("../utils/invoiceGenerator");
const downloadInvoice = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const orderId = req.params.orderId;
        const order = yield Order_1.default.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        const userId = req.user._id || req.user.id;
        if (order.brand.toString() !== userId.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }
        const brand = yield User_1.default.findById(order.brand);
        const brandProfile = yield BrandProfile_1.default.findOne({ user: order.brand });
        if (!brand || !brandProfile) {
            return res.status(404).json({ message: 'Brand details not found' });
        }
        const filePath = yield (0, invoiceGenerator_1.generateInvoice)(order, brand, brandProfile);
        res.download(filePath);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.downloadInvoice = downloadInvoice;
