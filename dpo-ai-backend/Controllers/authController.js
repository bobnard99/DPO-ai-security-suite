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

const sessionCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000
};

export const registerUser = async (req, res) => {
    try {
        const { name, username, email, password, companyName } = req.body ?? {};
        const normalizedName = typeof name === 'string' && name.trim() ? name.trim() : typeof username === 'string' ? username.trim() : '';
        const normalizedCompanyName = typeof companyName === 'string' && companyName.trim() ? companyName.trim() : 'Personal workspace';
        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

        if (!normalizedName || !normalizedEmail || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must contain at least 6 characters.' });
        }
        if (await User.exists({ email: normalizedEmail })) {
            return res.status(409).json({ error: 'That email is already registered.' });
        }

        const user = await User.create({ name: normalizedName, email: normalizedEmail, password, companyName: normalizedCompanyName });
        res.cookie('dpo_session', generateToken(user._id), sessionCookieOptions);
        return res.status(201).json({ success: true, user: publicUser(user), ...publicUser(user) });
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
        res.cookie('dpo_session', generateToken(user._id), sessionCookieOptions);
        return res.json({ success: true, user: publicUser(user), ...publicUser(user) });
    } catch (error) {
        return res.status(500).json({ error: 'Unable to sign in.' });
    }
};

export const logoutUser = (req, res) => {
    res.clearCookie('dpo_session', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
    return res.json({ success: true });
};
