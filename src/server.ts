import dotenv from 'dotenv';
dotenv.config();

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import connectDB from './config/db';
import { connectRedis } from './config/redis';
import apiRoutes from './routes/api';
import { initSocket } from './services/socket.service';
import Transaction from './models/Transaction';
import { allowedOrigins } from './config/cors';

const app: Express = express();
const httpServer = createServer(app);

// Initialize Socket.io
initSocket(httpServer);

// Middleware
app.use(cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));
import { StripeController } from './controllers/stripeController';

// Parse raw body for Stripe webhook BEFORE JSON parser
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), StripeController.webhook);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database Connection
connectDB();
connectRedis();

// Automated Escrow Release Job: Runs every 60 minutes to unlock 7-day holds
setInterval(async () => {
    try {
        const now = new Date();
        // Finds transactions where 7-day rule (availableAt) has been met
        const released = await Transaction.updateMany(
            { status: 'pending', type: 'earning', availableAt: { $lte: now } },
            { status: 'available' }
        );
        if (released.modifiedCount > 0) {
            console.log(`[Escrow Cron] Auto-released ${released.modifiedCount} funds to creators after 7-day hold.`);
        }
    } catch (err: any) {
        console.error(`[Escrow Cron Error] Failed to scan transactions:`, err.message);
    }
}, 3600000); // 60 minutes

// Routes
app.use('/api', apiRoutes);

app.get('/', (req: Request, res: Response) => {
    res.send('Influverse API Service is running');
});

// 404 Handler for undefined routes
app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[404] Not Found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ message: `Route ${req.originalUrl} not found on this server` });
});


// Error Handling Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 5000;


httpServer.listen(PORT, () => {
    console.log(`API Service with Socket.io running on port ${PORT}`);
});
