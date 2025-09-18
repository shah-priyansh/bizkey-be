const User = require('../models/User');
const Area = require('../models/Area');
const Client = require('../models/Client');
const ClientFeedback = require('../models/ClientFeedback');

// Generate a readable temporary password
const generateReadablePassword = () => {
  const adjectives = ['Happy', 'Bright', 'Quick', 'Smart', 'Strong', 'Fast', 'Cool', 'Wise'];
  const nouns = ['User', 'Star', 'Hero', 'Tiger', 'Eagle', 'Lion', 'Bear', 'Wolf'];
  const numbers = Math.floor(Math.random() * 999) + 100; // 3-digit number

  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];

  return `${adjective}${noun}${numbers}`;
};

// @desc    Get admin dashboard stats
// @access  Private (Admin only)
const getDashboard = async (req, res) => {
  try {
    const totalSalesmen = await User.countDocuments({ role: 'salesman', isActive: true });
    const totalClients = await Client.countDocuments({ isActive: true });
    const totalAreas = await Area.countDocuments({ isActive: true });
    const totalInquiries = await ClientFeedback.countDocuments();

    const recentSalesmen = await User.find({ role: 'salesman' })
      .select('firstName lastName email area lastLogin phone createdAt')
      .populate('area', 'name city')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentClients = await Client.find()
      .select('name company area status createdAt phone')
      .populate('area', 'name city')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentInquiries = await ClientFeedback.find()
      .select('client lead products audio notes createdBy createdAt')
      .populate('client', 'name company phone')
      .populate('createdBy', 'firstName lastName')
      .populate('products.product', 'productName')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      stats: {
        totalSalesmen,
        totalClients,
        totalAreas,
        totalInquiries
      },
      recentSalesmen,
      recentClients,
      recentInquiries
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create new user (salesman)
// @access  Private (Admin only)
const createUser = async (req, res) => {
  try {
    const { email, password, firstName, lastName, area, phone, role } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Check if area exists
    const areaExists = await Area.findById(area);
    if (!areaExists) {
      return res.status(400).json({ message: 'Area not found' });
    }

    // Generate a readable temporary password
    const tempPassword = generateReadablePassword();

    // Create new user
    const user = new User({
      email,
      password: tempPassword, // Use the generated temp password
      tempPassword: tempPassword, // Store the readable version
      firstName,
      lastName,
      area,
      phone,
      role: role || 'salesman' // Use provided role or default to salesman
    });

    await user.save();

    const userResponse = await User.findById(user._id)
      .select('-password')
      .populate('area', 'name city state');

    // Add the readable temporary password to response
    userResponse.password = tempPassword;

    res.status(201).json(userResponse);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all users with pagination and filtering
// @access  Private (Admin only)
const getUsers = async (req, res) => {
  try {
    const { role, area, search, page = 1, limit = 10 } = req.query;

    let query = {};

    if (!role) {
      query.role = 'salesman';
    }

    if (area) query.area = area;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password') // Exclude hashed password
      .populate('area', 'name city state')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Add readable password to each user
    const usersWithReadablePasswords = users.map(user => ({
      ...user.toObject(),
      password: user.tempPassword || 'Not Set'
    }));

    const total = await User.countDocuments(query);
    res.json({
      users: usersWithReadablePasswords,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update user
// @access  Private (Admin only)
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if area exists if updating area
    if (updateData.area) {
      const areaExists = await Area.findById(updateData.area);
      if (!areaExists) {
        return res.status(400).json({ message: 'Area not found' });
      }
    }

    const user = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password').populate('area', 'name city state');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete user
// @access  Private (Admin only)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Hard delete - permanently remove from database
    await User.findByIdAndDelete(id);

    res.json({
      message: 'User deleted successfully',
      data: { id: user._id, name: `${user.firstName} ${user.lastName}` }
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Toggle user status (active/inactive)
// @access  Private (Admin only)
const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const previousStatus = user.isActive;
    user.isActive = !user.isActive;
    await user.save();


    res.json({
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        _id: user._id,
        isActive: user.isActive,
        name: `${user.firstName} ${user.lastName}`
      }
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getDashboard,
  createUser,
  getUsers,
  updateUser,
  deleteUser,
  toggleUserStatus
};
