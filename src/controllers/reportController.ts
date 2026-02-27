import { Request, Response } from 'express';
import Report from '../models/Report';

// @desc    Create a new report
// @route   POST /api/reports
// @access  Private
export const createReport = async (req: Request | any, res: Response) => {
    try {
        const { reportedUserId, reason, description } = req.body;
        const reporterId = req.user._id || req.user.id;

        const report = await Report.create({
            reporter: reporterId,
            reportedUser: reportedUserId,
            reason,
            description,
            itemType: 'user', // Default for user reports
            status: 'pending',
        });

        res.status(201).json(report);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};
