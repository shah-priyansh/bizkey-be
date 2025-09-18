const { body, param, query } = require('express-validator');

// Validation for creating area
const createAreaValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Area name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Area name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Area name can only contain letters, numbers, spaces, hyphens, and underscores'),
  
  body('city')
    .trim()
    .notEmpty()
    .withMessage('City is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('City must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('City can only contain letters and spaces'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
];

// Validation for updating area
const updateAreaValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid area ID format'),
  
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Area name cannot be empty')
    .isLength({ min: 2, max: 100 })
    .withMessage('Area name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Area name can only contain letters, numbers, spaces, hyphens, and underscores'),
  
  body('city')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('City cannot be empty')
    .isLength({ min: 2, max: 50 })
    .withMessage('City must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('City can only contain letters and spaces'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
];

// Validation for getting areas with filters
const getAreasValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search term cannot exceed 100 characters'),
  
  query('city')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('City filter cannot exceed 50 characters'),
  
  query('isActive')
    .optional()
    .isIn(['true', 'false', ''])
    .withMessage('isActive must be true, false, or empty')
];

// Validation for area ID parameter
const areaIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid area ID format')
];

// Validation for toggle status
const toggleStatusValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid area ID format')
];

module.exports = {
  createAreaValidation,
  updateAreaValidation,
  getAreasValidation,
  areaIdValidation,
  toggleStatusValidation
};
