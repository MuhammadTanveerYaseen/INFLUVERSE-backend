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
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const db_1 = __importDefault(require("./config/db"));
const redis_1 = require("./config/redis");
const api_1 = __importDefault(require("./routes/api"));
const socket_service_1 = require("./services/socket.service");
const Transaction_1 = __importDefault(require("./models/Transaction"));
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
// Initialize Socket.io
(0, socket_service_1.initSocket)(httpServer);
// Middleware
app.use((0, cors_1.default)({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));
const stripeController_1 = require("./controllers/stripeController");
// Parse raw body for Stripe webhook BEFORE JSON parser
app.post('/api/stripe/webhook', express_1.default.raw({ type: 'application/json' }), stripeController_1.StripeController.webhook);
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Database Connection
(0, db_1.default)();
(0, redis_1.connectRedis)();
// Automated Escrow Release Job: Runs every 60 minutes to unlock 7-day holds
setInterval(() => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const now = new Date();
        // Finds transactions where 7-day rule (availableAt) has been met
        const released = yield Transaction_1.default.updateMany({ status: 'pending', type: 'earning', availableAt: { $lte: now } }, { status: 'available' });
        if (released.modifiedCount > 0) {
            console.log(`[Escrow Cron] Auto-released ${released.modifiedCount} funds to creators after 7-day hold.`);
        }
    }
    catch (err) {
        console.error(`[Escrow Cron Error] Failed to scan transactions:`, err.message);
    }
}), 3600000); // 60 minutes
// Routes
app.use('/api', api_1.default);
app.get('/', (req, res) => {
    res.send('Influverse API Service is running');
});
// 404 Handler for undefined routes
app.use((req, res, next) => {
    console.log(`[404] Not Found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ message: `Route ${req.originalUrl} not found on this server` });
});
// Error Handling Middleware
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
app.use((err, req, res, next) => {
    console.error(err.stack);
    // Log to a file for hard-to-track upload issues!
    try {
        fs_1.default.appendFileSync(path_1.default.join(__dirname, 'debug_upload_error.txt'), `[${new Date().toISOString()}] Error Code: ${err.code} | Message: ${err.message} | HTTP: ${err.http_code} | Multer: ${err.field} \n${err.stack}\n\n`);
    }
    catch (e) { }
    // Handle Multer errors specially
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ message: 'File is too large. Maximum allowed size is 50MB.' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ message: 'Unexpected field or too many files uploaded.' });
    }
    // Handle generic payload too large from express
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ message: 'Request payload is too large.' });
    }
    // If Cloudinary specifically rejects it, check for HTTP code or specific structure
    if (err.http_code && err.message) {
        return res.status(err.http_code).json({ message: `Cloudinary Error: ${err.message}` });
    }
    res.status(500).json({ message: err.message || 'Internal Server Error' });
});
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
    console.log(`API Service with Socket.io running on port ${PORT}`);
});
