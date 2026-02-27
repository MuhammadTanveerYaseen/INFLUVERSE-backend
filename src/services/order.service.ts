import Order from '../models/Order';
import PlatformSettings from '../models/PlatformSettings';
import User from '../models/User';

export class OrderService {
    static async createFromOffer(offer: any) {
        // Fetch Platform Fee Configuration
        const settings = await PlatformSettings.findOne();
        const feePercentage = settings?.platformFeePercentage || 15; // Default 15%

        const offerPrice = Number(offer.price);
        // Calculate Platform Fee with precision
        const platformFee = Number((offerPrice * (feePercentage / 100)).toFixed(2));
        const totalAmount = Number((offerPrice + platformFee).toFixed(2));

        const order = await Order.create({
            offer: offer._id || offer.id,
            brand: offer.brand,
            creator: offer.creator,
            price: offerPrice,
            platformFee,
            totalAmount,
            status: 'active',
            paid: false,
        });

        return order;
    }

    static async getOrders(query: any) {
        const orders = await Order.find(query)
            .populate('brand', 'username')
            .populate('creator', 'username');

        return orders;
    }

    static async getOrderById(id: string) {
        const order = await Order.findById(id)
            .populate('brand', 'username')
            .populate('creator', 'username');

        return order;
    }
}
