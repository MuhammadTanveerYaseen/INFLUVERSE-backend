import PDFDocument from 'pdfkit';
import { IOrder } from '../models/Order';
import { IBrandProfile } from '../models/BrandProfile';
import { IUser } from '../models/User';
import fs from 'fs';
import path from 'path';

export const generateInvoice = async (order: IOrder, brand: IUser, brandProfile: IBrandProfile): Promise<string> => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument();
        const invoiceName = `invoice_${order._id}.pdf`;
        const invoicePath = path.join(__dirname, '../../invoices', invoiceName);

        // Ensure directory exists
        const dir = path.dirname(invoicePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const stream = fs.createWriteStream(invoicePath);
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
};
