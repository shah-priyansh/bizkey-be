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
    const totalInquiries = await ClientFeedback.countDocuments({ isActive: true });

    // Get period parameter (default to 'month')
    const period = req.query.period || 'month';
    
    // Calculate date range based on period
    const now = new Date();
    let startDate = new Date();
    let groupByFormat = {};
    let limitCount = 0;
    let formatLabel = (item) => '';

    switch (period) {
      case 'day':
        // Last 30 days
        startDate.setDate(now.getDate() - 30);
        groupByFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
        limitCount = 30;
        formatLabel = (item) => {
          const date = new Date(item._id.year, item._id.month - 1, item._id.day);
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        };
        break;
      case 'week':
        // Last 12 weeks
        startDate.setDate(now.getDate() - 84); // 12 weeks
        groupByFormat = {
          year: { $year: '$createdAt' },
          week: { $week: '$createdAt' }
        };
        limitCount = 12;
        // We'll handle week formatting later to ensure consecutive weeks
        formatLabel = null; // Will be handled after aggregation
        break;
      case 'month':
      default:
        // Last 12 months
        startDate.setMonth(now.getMonth() - 12);
        groupByFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        };
        limitCount = 12;
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        formatLabel = (item) => `${monthNames[item._id.month - 1]} ${item._id.year}`;
        break;
    }

    // Get chart data for inquiries based on period
    const inquiriesChartData = await ClientFeedback.aggregate([
      {
        $match: {
          isActive: true,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: groupByFormat,
          count: { $sum: 1 }
        }
      },
      {
        $sort: period === 'day' 
          ? { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
          : period === 'week'
          ? { '_id.year': 1, '_id.week': 1 }
          : { '_id.year': 1, '_id.month': 1 }
      },
      {
        $limit: limitCount
      }
    ]);

    // Get chart data for clients - last 12 months
    const clientsChartData = await Client.aggregate([
      {
        $match: {
          isActive: true
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      },
      {
        $limit: 12
      }
    ]);

    // Format chart data
    const formatChartData = (data, formatter, periodType = null) => {
      if (periodType === 'week') {
        // Create a map of existing data indexed by year-week
        const weekData = new Map();
        data.forEach(item => {
          const key = `${item._id.year}-${item._id.week}`;
          weekData.set(key, item.count);
        });
        
        // Generate last 12 consecutive weeks (going backwards from today)
        const result = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        for (let i = 11; i >= 0; i--) {
          // Calculate the start of each week (Monday)
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - (i * 7));
          // Move to Monday of that week
          const dayOfWeek = weekStart.getDay();
          const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          weekStart.setDate(weekStart.getDate() - daysFromMonday);
          
          const year = weekStart.getFullYear();
          // Get ISO week number
          const weekNum = getISOWeek(weekStart);
          const key = `${year}-${weekNum}`;
          
          // Get start date of week for label
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          const startMonth = weekStart.toLocaleDateString('en-US', { month: 'short' });
          const startDay = weekStart.getDate();
          const endMonth = weekEnd.toLocaleDateString('en-US', { month: 'short' });
          const endDay = weekEnd.getDate();
          
          result.push({
            name: weekStart.getMonth() === weekEnd.getMonth() 
              ? `${startMonth} ${startDay}-${endDay}` 
              : `${startMonth} ${startDay} - ${endMonth} ${endDay}`,
            value: weekData.get(key) || 0
          });
        }
        return result;
      }
      
      return data.map(item => ({
        name: formatter(item),
        value: item.count
      }));
    };
    
    // Helper function to get ISO week number
    const getISOWeek = (date) => {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    };
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const recentInquiries = await ClientFeedback.find({ isActive: true })
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
      chartData: {
        inquiries: formatChartData(inquiriesChartData, formatLabel || ((item) => {
          if (period === 'week') return item.name; // Already formatted
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          if (period === 'day') {
            const date = new Date(item._id.year, item._id.month - 1, item._id.day);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          }
          return `${monthNames[item._id.month - 1]} ${item._id.year}`;
        }), period === 'week' ? 'week' : null),
        clients: formatChartData(clientsChartData, (item) => {
          return `${monthNames[item._id.month - 1]} ${item._id.year}`;
        })
      },
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
