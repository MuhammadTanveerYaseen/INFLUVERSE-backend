import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import User from '../models/User';

interface AuthRequest extends Request {
    user?: any;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];

            const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret');

            // Use Mongoose
            const user = await User.findById(decoded.id).select('-password');

            if (!user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            // Expose user to request
            req.user = user;

            next();
        } catch (error) {
            console.error('[AuthMiddleware] Error:', error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

export const authorize = (...roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: `User role ${req.user.role} is not authorized to access this route` });
        }
        next();
    };
};
