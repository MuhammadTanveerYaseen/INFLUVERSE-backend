import Offer from '../models/Offer';
import User from '../models/User';

export class OfferService {
    static async createOffer(data: any) {
        const offer = await Offer.create(data);
        return offer;
    }

    static async getOfferById(id: string) {
        const offer = await Offer.findById(id);
        return offer;
    }

    static async getOffers(query: any) {
        const offers = await Offer.find(query)
            .sort({ createdAt: -1 })
            .populate('brand', 'username profilePhoto')
            .populate('creator', 'username profilePhoto')
            .populate('order')
            .lean();

        return offers;
    }

    static async updateOfferStatus(offerId: string, status: 'pending' | 'rejected' | 'accepted' | 'countered', counterData?: { price: number, message: string }) {
        const offer = await Offer.findById(offerId);
        if (!offer) {
            throw new Error('Offer not found');
        }

        offer.status = status;

        if (status === 'countered') {
            if (!counterData) throw new Error('Counter offer data required');
            offer.counterOffer = counterData as any;
        }

        const updatedOffer = await offer.save();

        return updatedOffer;
    }
}
