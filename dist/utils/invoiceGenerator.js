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
exports.generateInvoice = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const generateInvoice = (order, brand, brandProfile) => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise((resolve, reject) => {
        const doc = new pdfkit_1.default();
        const invoiceName = `invoice_${order._id}.pdf`;
        const invoicePath = path_1.default.join(__dirname, '../../invoices', invoiceName);
        // Ensure directory exists
        const dir = path_1.default.dirname(invoicePath);
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        const stream = fs_1.default.createWriteStream(invoicePath);
        doc.pipe(stream);
        // Header
        doc.fontSize(20).text('INFLUVERSE INVOICE', { align: 'center' });
        doc.moveDown();
        // Details
        doc.fontSize(12).text(`Invoice ID: ${order._id}`);
        doc.text(`Date: ${new Date().toLocaleDateString()}`);
        doc.moveDown();
        doc.text(`To: ${brandProfile.companyName || brand.username}`);
        doc.text(`Email: ${brand.email}`);
        doc.moveDown();
        // Items
        doc.text('Description', 50, doc.y);
        doc.text('Amount', 400, doc.y, { align: 'right' });
        doc.moveDown();
        doc.text(`Creator Order #${order._id}`, 50, doc.y);
        doc.text(`$${order.price.toFixed(2)}`, 400, doc.y, { align: 'right' }); // Base Price
        doc.text(`Platform Fee`, 50, doc.y + 20);
        doc.text(`$${order.platformFee.toFixed(2)}`, 400, doc.y + 20, { align: 'right' }); // Fee
        doc.moveDown();
        doc.moveDown();
        // Total
        doc.fontSize(15).text(`Total: $${order.totalAmount.toFixed(2)}`, 400, doc.y, { align: 'right' });
        doc.end();
        stream.on('finish', () => {
            resolve(invoicePath);
        });
        stream.on('error', (err) => {
            reject(err);
        });
    });
});
exports.generateInvoice = generateInvoice;
