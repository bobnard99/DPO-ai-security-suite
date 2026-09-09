// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fileUpload from 'express-fileupload';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import auditRoutes from './routes/audit.js';
import authRoutes from './routes/authRoutes.js';

dotenv.config({ path: fileURLToPath(new URL('./.env', import.meta.url)) });

const app = express();
const PORT = process.env.PORT || 5000;
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false });
const auditLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false });

// Middleware z'ibanze
const configuredOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
const allowedOrigins = process.env.NODE_ENV === 'production'
    ? configuredOrigins
    : [...new Set([...configuredOrigins, 'http://localhost:5173', 'http://127.0.0.1:5173'])];
const isAllowedOrigin = (origin) => !origin
    || allowedOrigins.includes(origin)
    || (process.env.NODE_ENV !== 'production' && /^https:\/\/([a-z0-9-]+\.)?ngrok-free\.dev$/i.test(origin));

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
    origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Origin is not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(fileUpload({
    limits: { fileSize: 10 * 1024 * 1024 },
    abortOnLimit: true,
    createParentPath: false,
    useTempFiles: false
}));
app.use(express.json({ limit: '100kb' }));

const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not configured');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected successfully.');
    } catch (error) {
        console.error('MongoDB connection error:', error.message);
        process.exit(1);
    }
};

app.use('/api/v1/audit', auditLimiter, auditRoutes);
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/audit', auditLimiter, auditRoutes);
app.use('/api/auth', authLimiter, authRoutes);

app.get('/', (req, res) => {
    res.send('DPO AI Security Suite API is running.');
});

const startServer = async () => {
    await connectDB();
    app.listen(PORT, () => {
        console.log(`Backend server listening on http://localhost:${PORT}`);
    });
};

startServer();
