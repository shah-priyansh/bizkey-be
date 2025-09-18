const { comparePassword } = require('../utils/helper');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validateChangePassword, validateLogin } = require('../validations/auth');

const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const login = async (req, res) => {
    try {
        const { error } = validateLogin(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }
        const { username, password } = req.body;

        // Find user by username or email   
        const user = await User.findOne({
            email: username
        }).populate('area', 'name city state');

        if (!user || !user.isActive) {
            return res.status(400).json({ message: 'Invalid credentials or user inactive' });
        }

        // Check password
        const isMatch = await comparePassword(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate token
        const token = generateToken(user._id);

        res.json({
            token,
            user: user.getPublicProfile()
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const me = async (req, res) => {
    const user = await User.findById(req.user._id);
    res.json(user);
};

const changePassword = async (req, res) => {
    const { error } = validateChangePassword(req.body);
    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    const isMatch = await comparePassword(currentPassword, user.password);
    if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password updated successfully' });
};
module.exports = { login, me, changePassword };