import { Request, Response } from 'express';
import Offer from '../models/Offer';
import Order from '../models/Order';
import mongoose from 'mongoose';

export const getActionsCount = async (req: Request | any, res: Response) => {
    try {
        const userId = (req.user._id || req.user.id).toString();
        const role = req.user.role;

        const userObjectId = new mongoose.Types.ObjectId(userId);

        let offerCount = 0;
        let orderCount = 0;

        if (role === 'brand') {
            [offerCount, orderCount] = await Promise.all([
                Offer.countDocuments({
                    brand: userObjectId,
                    $or: [
                        { status: 'pending', sender: { $ne: userObjectId } },
                        { status: 'countered', sender: userObjectId },
                        { status: 'accepted', paid: false }
                    ]
                }),
                Order.countDocuments({
                    brand: userObjectId,
                    status: { $in: ['pending_payment', 'delivered'] }
                })
            ]);
        } else if (role === 'creator') {
            [offerCount, orderCount] = await Promise.all([
                Offer.countDocuments({
                    creator: userObjectId,
                    $or: [
                        { status: 'pending', sender: { $ne: userObjectId } },
                        { status: 'countered', sender: userObjectId },
                        { status: 'accepted', paid: false }
                    ]
                }),
                Order.countDocuments({
                    creator: userObjectId,
                    status: { $in: ['active', 'revision', 'pending_payment'] }
                })
            ]);
        }

        res.json({
            offers: offerCount,
            orders: orderCount
        });
    } catch (error: any) {
        console.error("Error fetching actions count:", error);
        res.status(500).json({ message: "Failed to fetch actions count" });
    }
};
