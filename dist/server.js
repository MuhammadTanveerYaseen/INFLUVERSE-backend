"use strict";
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
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
// Initialize Socket.io
(0, socket_service_1.initSocket)(httpServer);
// Middleware
app.use((0, cors_1.default)({
    origin: [
        process.env.FRONTEND_URL || "http://localhost:3000",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://influverse-frontend.vercel.app"
    ],
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
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
    console.log(`API Service with Socket.io running on port ${PORT}`);
});
