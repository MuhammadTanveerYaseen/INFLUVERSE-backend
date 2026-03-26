import { createClient } from 'redis';
import dotenv from 'dotenv';
dotenv.config();

const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => {
    // Only log essential errors once or if not a connection refused
    if (err.code !== 'ECONNREFUSED') {
        console.warn('Redis Client Error:', err.message);
    }
});
redisClient.on('connect', () => console.log('Redis connected successfully'));

export const connectRedis = async () => {
    try {
        await redisClient.connect();
    } catch (error: any) {
        if (error.code === 'ECONNREFUSED') {
            console.log('Redis is not running locally. Caching will be disabled.');
        } else {
            console.error('Failed to connect to Redis', error);
        }
    }
};

export default redisClient;
