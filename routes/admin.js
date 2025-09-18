const express = require('express');
const { validationResult } = require('express-validator');
const { adminAuth } = require('../middleware/auth');
const adminController = require('../controllers/admin');
const adminValidation = require('../validations/admin');

const router = express.Router();

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard stats
// @access  Private (Admin only)
router.get('/dashboard', adminAuth, adminController.getDashboard);

// @route   POST /api/admin/users
// @desc    Create new user (salesman)
// @access  Private (Admin only)
router.post('/users', [
  adminAuth,
  ...adminValidation.createUserValidation
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}, adminController.createUser);

// @route   GET /api/admin/users
// @desc    Get all users with pagination and filtering
// @access  Private (Admin only)
router.get('/users', adminAuth, adminController.getUsers);

// @route   PUT /api/admin/users/:id
// @desc    Update user
// @access  Private (Admin only)
router.put('/users/:id', [
  adminAuth,
  ...adminValidation.updateUserValidation
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}, adminController.updateUser);

// @route   DELETE /api/admin/users/:id
// @desc    Delete user
// @access  Private (Admin only)
router.delete('/users/:id', adminAuth, adminController.deleteUser);

// @route   PATCH /api/admin/users/:id/toggle-status
// @desc    Toggle user status (active/inactive)
// @access  Private (Admin only)
router.patch('/users/:id/toggle-status', adminAuth, adminController.toggleUserStatus);

module.exports = router;
