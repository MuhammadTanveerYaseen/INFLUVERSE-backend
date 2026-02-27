import { Request, Response } from 'express';
import { SupportTicket } from '../models/SupportTicket';

export const createTicket = async (req: Request, res: Response) => {
    try {
        const { subject, description, type } = req.body;
        const userId = (req as any).user._id || (req as any).user.id;

        const ticket = await SupportTicket.create({
            user: userId,
            subject,
            description,
            type,
            status: 'open',
            adminResponse: '',
        });

        res.status(201).json(ticket);
    } catch (error) {
        console.error('Error creating support ticket:', error);
        res.status(500).json({ message: 'Failed to create support ticket' });
    }
};

export const getUserTickets = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user._id || (req as any).user.id;
        const tickets = await SupportTicket.find({ user: userId }).sort({ createdAt: -1 });

        res.status(200).json(tickets);
    } catch (error) {
        console.error('Error fetching user tickets:', error);
        res.status(500).json({ message: 'Failed to fetch tickets' });
    }
};

export const getAllTickets = async (req: Request, res: Response) => {
    try {
        const tickets = await SupportTicket.find()
            .populate('user', 'username email role')
            .sort({ createdAt: -1 });

        res.status(200).json(tickets);
    } catch (error) {
        console.error('Error fetching all tickets:', error);
        res.status(500).json({ message: 'Failed to fetch tickets' });
    }
};

export const updateTicketStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status, adminResponse } = req.body;

        const ticket = await SupportTicket.findById(id);
        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        const data: any = {};
        if (status) data.status = status;
        if (adminResponse !== undefined) data.adminResponse = adminResponse;

        const updated = await SupportTicket.findByIdAndUpdate(id, data, { new: true });

        res.status(200).json(updated);
    } catch (error) {
        console.error('Error updating ticket status:', error);
        res.status(500).json({ message: 'Failed to update ticket status' });
    }
};
