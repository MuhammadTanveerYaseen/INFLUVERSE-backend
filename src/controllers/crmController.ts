import { Request, Response } from 'express';
import CRMItem from '../models/CRMItem';
import redisClient from '../config/redis';

const CACHE_KEY = 'crmItems';
const CACHE_TTL = 300; // 5 minutes in seconds

export const getCRMItems = async (req: Request, res: Response) => {
    try {
        if (redisClient.isReady) {
            const cachedData = await redisClient.get(CACHE_KEY);
            if (cachedData) {
                return res.status(200).json(JSON.parse(cachedData));
            }
        }

        const items = await CRMItem.find().sort({ createdAt: -1 }).lean();

        const mappedItems = items.map(crmItem => ({
            _id: crmItem._id,
            type: crmItem.type,
            platform: crmItem.platform,
            category: crmItem.category,
            name: crmItem.name,
            channelUrl: crmItem.channelUrl,
            channelId: crmItem.channelId,
            email: crmItem.email,
            follower: crmItem.follower,
            phase: crmItem.phase,
            worker: crmItem.worker,
            outreachedDate: crmItem.outreachedDate ? new Date(crmItem.outreachedDate).toISOString().split('T')[0] : '',
            followUpDate: crmItem.followUpDate ? new Date(crmItem.followUpDate).toISOString().split('T')[0] : '',
            comments: crmItem.comments
        }));

        if (redisClient.isReady) {
            await redisClient.setEx(CACHE_KEY, CACHE_TTL, JSON.stringify(mappedItems));
        }

        res.status(200).json(mappedItems);
    } catch (error) {
        console.error('Error fetching CRM pipeline data:', error);
        res.status(500).json({ message: 'Failed to fetch CRM data' });
    }
};

export const createCRMItem = async (req: Request, res: Response) => {
    try {
        const newItem = await CRMItem.create(req.body);
        
        if (redisClient.isOpen) {
            await redisClient.del(CACHE_KEY);
        }

        res.status(201).json(newItem);
    } catch (error: any) {
        console.error('Error creating CRM item:', error);
        res.status(500).json({ message: error.message || 'Failed to create CRM item' });
    }
};

export const updateCRMItem = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const crmItem = await CRMItem.findById(id);
        if (!crmItem) {
            return res.status(404).json({ message: 'CRM Item not found' });
        }

        let updateData: any = { ...updates };
        delete updateData._id; // Prevent updating ID

        if (updateData.outreachedDate === '') updateData.outreachedDate = null;
        if (updateData.followUpDate === '') updateData.followUpDate = null;

        if (updateData.outreachedDate && typeof updateData.outreachedDate === 'string') {
            updateData.outreachedDate = new Date(updateData.outreachedDate);
        }
        if (updateData.followUpDate && typeof updateData.followUpDate === 'string') {
            updateData.followUpDate = new Date(updateData.followUpDate);
        }

        await CRMItem.findByIdAndUpdate(id, updateData, { new: true });

        if (redisClient.isOpen) {
            await redisClient.del(CACHE_KEY);
        }

        res.status(200).json({ message: 'CRM pipeline updated.' });
    } catch (error) {
        console.error('Error updating CRM pipeline data:', error);
        res.status(500).json({ message: 'Failed to update CRM data' });
    }
};

export const deleteCRMItem = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const crmItem = await CRMItem.findById(id);
        if (crmItem) {
            await CRMItem.findByIdAndDelete(id);
            if (redisClient.isOpen) {
                await redisClient.del(CACHE_KEY);
            }
            res.status(200).json({ message: 'CRM item deleted.' });
        } else {
            res.status(404).json({ message: 'Item not found' });
        }
    } catch (error) {
        console.error('Error deleting CRM item:', error);
        res.status(500).json({ message: 'Failed to delete CRM item' });
    }
};

export const updateCRMItemOrder = async (req: Request, res: Response) => {
    res.status(200).json({ message: 'Order ignored.' });
};
