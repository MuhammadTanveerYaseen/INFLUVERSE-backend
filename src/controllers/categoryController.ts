import { Request, Response } from 'express';
import Category from '../models/Category';

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
export const getCategories = async (req: Request, res: Response) => {
    try {
        const count = await Category.countDocuments();
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
            await Category.insertMany(defaultCategories);
        }

        const query = req.query.all === 'true' ? {} : { isActive: true };
        const categories = await Category.find(query).sort({ name: 1 });

        res.json(categories);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create a category
// @route   POST /api/categories
// @access  Private (Admin)
export const createCategory = async (req: Request, res: Response) => {
    try {
        const { name, icon, description, isActive, gradientColors } = req.body;

        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

        const categoryExists = await Category.findOne({ slug });
        if (categoryExists) {
            return res.status(400).json({ message: 'Category already exists' });
        }

        const category = await Category.create({
            name,
            slug,
            icon: icon || 'LayoutGrid',
            description: description || '',
            isActive: isActive !== false,
            gradientColors: Array.isArray(gradientColors) && gradientColors.length > 0 ? gradientColors : ['#8E9FFE', '#BFAFFE']
        });

        res.status(201).json(category);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private (Admin)
export const updateCategory = async (req: Request, res: Response) => {
    try {
        const { name, icon, description, isActive, gradientColors } = req.body;

        const categoryId = req.params.id as string;
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        if (name) {
            category.name = name;
            category.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        }
        if (icon) category.icon = icon;
        if (description !== undefined) category.description = description;
        if (isActive !== undefined) category.isActive = isActive;
        if (gradientColors && Array.isArray(gradientColors) && gradientColors.length > 0) {
            category.gradientColors = gradientColors;
        }

        const updatedCategory = await category.save();

        res.json(updatedCategory);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private (Admin)
export const deleteCategory = async (req: Request, res: Response) => {
    try {
        const categoryId = req.params.id as string;
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        await Category.findByIdAndDelete(categoryId);
        res.json({ message: 'Category removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};
