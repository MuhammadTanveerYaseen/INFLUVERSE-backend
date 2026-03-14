"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCreatorProfile = void 0;
const { check, validationResult } = require('express-validator');
exports.validateCreatorProfile = [
    check('profileData.bio').optional().isString().withMessage('Bio must be a string'),
    check('profileData.categories').optional().isArray().withMessage('Categories must be an array'), // Updated from category
    check('profileData.coverImage').optional().isString().withMessage('Cover Image must be a valid string URL'),
    check('profileData.country').optional().isString().withMessage('Country is required'),
    check('profileData.packages').optional().isArray().withMessage('Packages must be an array'),
    check('profileData.packages.*.name').notEmpty().withMessage('Package name is required'),
    check('profileData.packages.*.price').isNumeric().withMessage('Package price must be a number'),
    check('profileData.packages.*.description').notEmpty().withMessage('Package description is required'),
    check('profileData.addOns').optional().isArray().withMessage('Add-ons must be an array'),
    check('profileData.addOns.*.title').notEmpty().withMessage('Add-on title is required'),
    check('profileData.addOns.*.price').isNumeric().withMessage('Add-on price must be a number'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];
