import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'node:url';
import User from '../models/User.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

const getSessionCookie = (header) => header.split(';').map((part) => part.trim()).find((part) => part.startsWith('dpo_session='))?.slice('dpo_session='.length);

export const protect = async (req, res, next) => {
    const authorization = req.headers.authorization || '';
    const [scheme, bearerToken] = authorization.split(' ');
    const cookieToken = getSessionCookie(req.headers.cookie || '');
    const token = cookieToken || bearerToken;

    if (!token || (!cookieToken && scheme !== 'Bearer')) {
        return res.status(401).json({ error: 'Authentication token is required.' });
    }

    if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET is not configured.');
        return res.status(500).json({ error: 'Authentication is not configured.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        if (!user) return res.status(401).json({ error: 'User account no longer exists.' });
        req.user = user;
        return next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired authentication token.' });
    }
};

export const authMiddleware = protect;
