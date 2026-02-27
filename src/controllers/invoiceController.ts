import { Request, Response } from 'express';
import Order from '../models/Order';
import User from '../models/User';
import BrandProfile from '../models/BrandProfile';
import { generateInvoice } from '../utils/invoiceGenerator';

export const downloadInvoice = async (req: Request | any, res: Response) => {
    try {
        const orderId = req.params.orderId as string;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const userId = req.user._id || req.user.id;

        if (order.brand.toString() !== userId.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const brand = await User.findById(order.brand);
        const brandProfile = await BrandProfile.findOne({ user: order.brand });

        if (!brand || !brandProfile) {
            return res.status(404).json({ message: 'Brand details not found' });
        }

        const filePath = await generateInvoice(order, brand, brandProfile);
        res.download(filePath as string);

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
