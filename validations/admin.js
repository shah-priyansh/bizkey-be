const { body } = require('express-validator');

// Validation rules for creating a user
const createUserValidation = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('firstName')
    .notEmpty()
    .withMessage('First name is required')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .notEmpty()
    .withMessage('Last name is required')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('area')
    .notEmpty()
    .withMessage('Area is required')
    .isMongoId()
    .withMessage('Valid area ID is required'),
  body('role')
    .optional()
    .isIn(['admin', 'manager', 'salesman'])
    .withMessage('Role must be admin, manager, or salesman'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Valid phone number is required')
];

// Validation rules for updating a user
const updateUserValidation = [
  body('firstName')
    .optional()
    .notEmpty()
    .withMessage('First name cannot be empty')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .optional()
    .notEmpty()
    .withMessage('Last name cannot be empty')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Valid phone number is required'),
  body('area')
    .optional()
    .notEmpty()
    .withMessage('Area cannot be empty')
    .isMongoId()
    .withMessage('Valid area ID is required'),
  body('role')
    .optional()
    .isIn(['admin', 'manager', 'salesman'])
    .withMessage('Role must be admin, manager, or salesman'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be boolean')
];

// Validation rules for user ID parameter
const userIdValidation = [
  body('id')
    .isMongoId()
    .withMessage('Valid user ID is required')
];

module.exports = {
  createUserValidation,
  updateUserValidation,
  userIdValidation
};
