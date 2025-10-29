const Notification = require('../models/Notification');

// @desc    Get all notifications/audit logs
// @access  Private (Admin only)
const getNotifications = async (req, res) => {
  try {
    const { type, salesmanId, clientId, page = 1, limit = 50 } = req.query;

    let query = {};

    // Admin can see all, salesman can only see their own
    if (req.user.role === 'salesman') {
      query.salesman = req.user._id;
    } else if (salesmanId) {
      query.salesman = salesmanId;
    }

    if (type) {
      query.type = type;
    }

    if (clientId) {
      query.client = clientId;
    }

    const notifications = await Notification.find(query)
      .populate('salesman', 'firstName lastName email')
      .populate('client', 'name company phone area')
      .populate('otpId', 'otp expiresAt isUsed')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(query);

    res.json({
      notifications,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get unread notification count
// @access  Private
const getUnreadCount = async (req, res) => {
  try {
    let query = { isRead: false };

    // Admin sees all unread, salesman sees only their own
    if (req.user.role === 'salesman') {
      query.salesman = req.user._id;
    }

    const count = await Notification.countDocuments(query);

    res.json({ count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Mark notification as read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    let query = { _id: id };

    // Salesman can only mark their own notifications as read
    if (req.user.role === 'salesman') {
      query.salesman = req.user._id;
    }

    const notification = await Notification.findOneAndUpdate(
      query,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Mark all notifications as read
// @access  Private
const markAllAsRead = async (req, res) => {
  try {
    let query = { isRead: false };

    // Admin marks all, salesman marks only their own
    if (req.user.role === 'salesman') {
      query.salesman = req.user._id;
    }

    await Notification.updateMany(query, { isRead: true });

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead
};
