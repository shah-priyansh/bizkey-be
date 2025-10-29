const express = require('express');
const { auth, adminAuth } = require('../middleware/auth');
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead
} = require('../controllers/notification');

const router = express.Router();

// @route   GET /api/notifications
// @desc    Get all notifications/audit logs
// @access  Private (Admin sees all, Salesman sees only their own)
router.get('/', auth, getNotifications);

// @route   GET /api/notifications/unread-count
// @desc    Get unread notification count
// @access  Private
router.get('/unread-count', auth, getUnreadCount);

// @route   PATCH /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.patch('/:id/read', auth, markAsRead);

// @route   PATCH /api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.patch('/read-all', auth, markAllAsRead);

module.exports = router;
