const { body } = require('express-validator');

const createFeedbackValidation = [
  body('client')
    .notEmpty()
    .withMessage('Client is required')
    .isMongoId()
    .withMessage('Invalid client ID'),

  body('lead')
    .notEmpty()
    .withMessage('Lead status is required')
    .isIn(['Red', 'Green', 'Orange'])
    .withMessage('Lead must be Red, Green, or Orange'),

  body('date')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),

  body('products')
    .isArray({ min: 1 })
    .withMessage('At least one product is required'),

  body('products.*.product')
    .notEmpty()
    .withMessage('Product ID is required')
    .isMongoId()
    .withMessage('Invalid product ID'),

  body('products.*.quantity')
    .notEmpty()
    .withMessage('Product quantity is required')
    .isInt({ min: 0 })
    .withMessage('Product quantity must be a non-negative integer'),

  body('audio.url')
    .optional()
    .isURL()
    .withMessage('Invalid audio URL'),

  body('audio.key')
    .optional()
    .isLength({ min: 1, max: 500 })
    .withMessage('Audio key must be between 1 and 500 characters'),

  body('audio.originalName')
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage('Audio original name must be between 1 and 255 characters'),

  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters')
];

const updateFeedbackValidation = [
  body('lead')
    .optional()
    .isIn(['Red', 'Green', 'Orange'])
    .withMessage('Lead must be Red, Green, or Orange'),

  body('date')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),

  body('products')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one product is required'),

  body('products.*.product')
    .optional()
    .isMongoId()
    .withMessage('Invalid product ID'),

  body('products.*.quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Product quantity must be a non-negative integer'),

  body('audio.url')
    .optional()
    .isURL()
    .withMessage('Invalid audio URL'),

  body('audio.key')
    .optional()
    .isLength({ min: 1, max: 500 })
    .withMessage('Audio key must be between 1 and 500 characters'),

  body('audio.originalName')
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage('Audio original name must be between 1 and 255 characters'),

  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters')
];

const generateSignedUrlValidation = [
  body('fileName')
    .notEmpty()
    .withMessage('File name is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('File name must be between 1 and 255 characters'),

  body('fileType')
    .notEmpty()
    .withMessage('File type is required')
    .isIn(['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/m4a', 'audio/ogg'])
    .withMessage('File type must be a valid audio format')
];

module.exports = {
  createFeedbackValidation,
  updateFeedbackValidation,
  generateSignedUrlValidation
};


