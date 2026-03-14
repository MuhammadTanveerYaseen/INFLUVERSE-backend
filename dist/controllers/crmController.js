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
exports.updateCRMItemOrder = exports.deleteCRMItem = exports.updateCRMItem = exports.createCRMItem = exports.getCRMItems = void 0;
const CRMItem_1 = __importDefault(require("../models/CRMItem"));
const getCRMItems = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const items = yield CRMItem_1.default.find().sort({ createdAt: -1 });
        const mappedItems = items.map(crmItem => ({
            _id: crmItem._id,
            type: crmItem.type,
            name: crmItem.name,
            email: crmItem.email,
            platform: crmItem.platform,
            phase: crmItem.phase,
            worker: crmItem.worker,
            outreachedDate: crmItem.outreachedDate ? new Date(crmItem.outreachedDate).toISOString().split('T')[0] : '',
            followUpDate: crmItem.followUpDate ? new Date(crmItem.followUpDate).toISOString().split('T')[0] : '',
            comments: crmItem.comments
        }));
        res.status(200).json(mappedItems);
    }
    catch (error) {
        console.error('Error fetching CRM pipeline data:', error);
        res.status(500).json({ message: 'Failed to fetch CRM data' });
    }
});
exports.getCRMItems = getCRMItems;
const createCRMItem = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const newItem = yield CRMItem_1.default.create(req.body);
        res.status(201).json(newItem);
    }
    catch (error) {
        console.error('Error creating CRM item:', error);
        res.status(500).json({ message: error.message || 'Failed to create CRM item' });
    }
});
exports.createCRMItem = createCRMItem;
const updateCRMItem = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const updates = req.body;
        const crmItem = yield CRMItem_1.default.findById(id);
        if (!crmItem) {
            return res.status(404).json({ message: 'CRM Item not found' });
        }
        let updateData = Object.assign({}, updates);
        delete updateData._id; // Prevent updating ID
        if (updateData.outreachedDate === '')
            updateData.outreachedDate = null;
        if (updateData.followUpDate === '')
            updateData.followUpDate = null;
        if (updateData.outreachedDate && typeof updateData.outreachedDate === 'string') {
            updateData.outreachedDate = new Date(updateData.outreachedDate);
        }
        if (updateData.followUpDate && typeof updateData.followUpDate === 'string') {
            updateData.followUpDate = new Date(updateData.followUpDate);
        }
        yield CRMItem_1.default.findByIdAndUpdate(id, updateData, { new: true });
        res.status(200).json({ message: 'CRM pipeline updated.' });
    }
    catch (error) {
        console.error('Error updating CRM pipeline data:', error);
        res.status(500).json({ message: 'Failed to update CRM data' });
    }
});
exports.updateCRMItem = updateCRMItem;
const deleteCRMItem = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const crmItem = yield CRMItem_1.default.findById(id);
        if (crmItem) {
            yield CRMItem_1.default.findByIdAndDelete(id);
            res.status(200).json({ message: 'CRM item deleted.' });
        }
        else {
            res.status(404).json({ message: 'Item not found' });
        }
    }
    catch (error) {
        console.error('Error deleting CRM item:', error);
        res.status(500).json({ message: 'Failed to delete CRM item' });
    }
});
exports.deleteCRMItem = deleteCRMItem;
const updateCRMItemOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.status(200).json({ message: 'Order ignored.' });
});
exports.updateCRMItemOrder = updateCRMItemOrder;
