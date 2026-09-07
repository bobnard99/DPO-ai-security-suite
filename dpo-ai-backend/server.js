// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fileUpload from 'express-fileupload';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import auditRoutes from './routes/audit.js';
import authRoutes from './routes/authRoutes.js';

dotenv.config({ path: fileURLToPath(new URL('./.env', import.meta.url)) });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware z'ibanze
const allowedOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
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
app.use(express.json());

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

connectDB();

app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/auth', authRoutes);

app.get('/', (req, res) => {
    res.send('DPO AI Security Suite API is running.');
});

app.listen(PORT, () => {
    console.log(`Backend server listening on http://localhost:${PORT}`);
});
