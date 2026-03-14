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
exports.deleteCategory = exports.updateCategory = exports.createCategory = exports.getCategories = void 0;
const Category_1 = __importDefault(require("../models/Category"));
// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
const getCategories = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const count = yield Category_1.default.countDocuments();
        if (count === 0) {
            const defaultCategories = [
                { name: 'Fashion', slug: 'fashion', icon: 'Shirt', description: 'Fashion and apparel', isActive: true, gradientColors: ['#8E9FFE', '#BFAFFE'] },
                { name: 'Tech', slug: 'tech', icon: 'Monitor', description: 'Technology and gadgets', isActive: true, gradientColors: ['#8E9FFE', '#BFAFFE'] },
                { name: 'Lifestyle', slug: 'lifestyle', icon: 'Coffee', description: 'Daily life and routines', isActive: true, gradientColors: ['#8E9FFE', '#BFAFFE'] },
                { name: 'Gaming', slug: 'gaming', icon: 'Gamepad2', description: 'Video games and streams', isActive: true, gradientColors: ['#8E9FFE', '#BFAFFE'] },
                { name: 'Beauty', slug: 'beauty', icon: 'Sparkles', description: 'Makeup and skincare', isActive: true, gradientColors: ['#8E9FFE', '#BFAFFE'] },
                { name: 'Travel', slug: 'travel', icon: 'Plane', description: 'Vlogs and destinations', isActive: true, gradientColors: ['#8E9FFE', '#BFAFFE'] },
                { name: 'Fitness', slug: 'fitness', icon: 'Dumbbell', description: 'Health and workouts', isActive: true, gradientColors: ['#8E9FFE', '#BFAFFE'] },
                { name: 'Business', slug: 'business', icon: 'Briefcase', description: 'Finance and entrepreneurship', isActive: true, gradientColors: ['#8E9FFE', '#BFAFFE'] }
            ];
            yield Category_1.default.insertMany(defaultCategories);
        }
        const query = req.query.all === 'true' ? {} : { isActive: true };
        const categories = yield Category_1.default.find(query).sort({ name: 1 });
        res.json(categories);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});
exports.getCategories = getCategories;
// @desc    Create a category
// @route   POST /api/categories
// @access  Private (Admin)
const createCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, icon, description, isActive, gradientColors } = req.body;
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const categoryExists = yield Category_1.default.findOne({ slug });
        if (categoryExists) {
            return res.status(400).json({ message: 'Category already exists' });
        }
        const category = yield Category_1.default.create({
            name,
            slug,
            icon: icon || 'LayoutGrid',
            description: description || '',
            isActive: isActive !== false,
            gradientColors: Array.isArray(gradientColors) && gradientColors.length > 0 ? gradientColors : ['#8E9FFE', '#BFAFFE']
        });
        res.status(201).json(category);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});
exports.createCategory = createCategory;
// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private (Admin)
const updateCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, icon, description, isActive, gradientColors } = req.body;
        const categoryId = req.params.id;
        const category = yield Category_1.default.findById(categoryId);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
        if (name) {
            category.name = name;
            category.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        }
        if (icon)
            category.icon = icon;
        if (description !== undefined)
            category.description = description;
        if (isActive !== undefined)
            category.isActive = isActive;
        if (gradientColors && Array.isArray(gradientColors) && gradientColors.length > 0) {
            category.gradientColors = gradientColors;
        }
        const updatedCategory = yield category.save();
        res.json(updatedCategory);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});
exports.updateCategory = updateCategory;
// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private (Admin)
const deleteCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const categoryId = req.params.id;
        const category = yield Category_1.default.findById(categoryId);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
        yield Category_1.default.findByIdAndDelete(categoryId);
        res.json({ message: 'Category removed' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});
exports.deleteCategory = deleteCategory;
