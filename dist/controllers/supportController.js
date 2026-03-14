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
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTicketStatus = exports.getAllTickets = exports.getUserTickets = exports.createTicket = void 0;
const SupportTicket_1 = require("../models/SupportTicket");
const createTicket = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { subject, description, type } = req.body;
        const userId = req.user._id || req.user.id;
        const ticket = yield SupportTicket_1.SupportTicket.create({
            user: userId,
            subject,
            description,
            type,
            status: 'open',
            adminResponse: '',
        });
        res.status(201).json(ticket);
    }
    catch (error) {
        console.error('Error creating support ticket:', error);
        res.status(500).json({ message: 'Failed to create support ticket' });
    }
});
exports.createTicket = createTicket;
const getUserTickets = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user._id || req.user.id;
        const tickets = yield SupportTicket_1.SupportTicket.find({ user: userId }).sort({ createdAt: -1 });
        res.status(200).json(tickets);
    }
    catch (error) {
        console.error('Error fetching user tickets:', error);
        res.status(500).json({ message: 'Failed to fetch tickets' });
    }
});
exports.getUserTickets = getUserTickets;
const getAllTickets = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const tickets = yield SupportTicket_1.SupportTicket.find()
            .populate('user', 'username email role')
            .sort({ createdAt: -1 });
        res.status(200).json(tickets);
    }
    catch (error) {
        console.error('Error fetching all tickets:', error);
        res.status(500).json({ message: 'Failed to fetch tickets' });
    }
});
exports.getAllTickets = getAllTickets;
const updateTicketStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { status, adminResponse } = req.body;
        const ticket = yield SupportTicket_1.SupportTicket.findById(id);
        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }
        const data = {};
        if (status)
            data.status = status;
        if (adminResponse !== undefined)
            data.adminResponse = adminResponse;
        const updated = yield SupportTicket_1.SupportTicket.findByIdAndUpdate(id, data, { new: true });
        res.status(200).json(updated);
    }
    catch (error) {
        console.error('Error updating ticket status:', error);
        res.status(500).json({ message: 'Failed to update ticket status' });
    }
});
exports.updateTicketStatus = updateTicketStatus;
