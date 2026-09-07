import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'node:url';
import User from '../models/User.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

const publicUser = (user) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    companyName: user.companyName
});

const generateToken = (id) => {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not configured.');
    return jwt.sign({ id: id.toString() }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

export const registerUser = async (req, res) => {
    try {
        const { name, email, password, companyName } = req.body ?? {};
        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

        if (!name?.trim() || !normalizedEmail || !password || !companyName?.trim()) {
            return res.status(400).json({ error: 'Name, email, password, and company name are required.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must contain at least 6 characters.' });
        }
        if (await User.exists({ email: normalizedEmail })) {
            return res.status(409).json({ error: 'That email is already registered.' });
        }

        const user = await User.create({ name: name.trim(), email: normalizedEmail, password, companyName: companyName.trim() });
        return res.status(201).json({ ...publicUser(user), token: generateToken(user._id) });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'That email is already registered.' });
        return res.status(500).json({ error: 'Unable to create the account.' });
    }
};

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body ?? {};
        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
        const user = await User.findOne({ email: normalizedEmail }).select('+password');

        if (!user || typeof password !== 'string' || !(await user.matchPassword(password))) {
            return res.status(401).json({ error: 'Email or password is incorrect.' });
        }
        return res.json({ ...publicUser(user), token: generateToken(user._id) });
    } catch (error) {
        return res.status(500).json({ error: 'Unable to sign in.' });
    }
};
