const { body, param } = require('express-validator');

const createProductValidation = [
    body('productName')
        .notEmpty()
        .withMessage('Product name is required')
        .isLength({ min: 1, max: 100 })
        .withMessage('Product name must be between 1 and 100 characters')
        .trim(),
    body('isActive')
        .optional()
        .isBoolean()
        .withMessage('isActive must be a boolean value')
];

const updateProductValidation = [
    param('id')
        .isMongoId()
        .withMessage('Invalid product ID'),
    body('productName')
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage('Product name must be between 1 and 100 characters')
        .trim(),
    body('isActive')
        .optional()
        .isBoolean()
        .withMessage('isActive must be a boolean value')
];

const getProductValidation = [
    param('id')
        .isMongoId()
        .withMessage('Invalid product ID')
];

const deleteProductValidation = [
    param('id')
        .isMongoId()
        .withMessage('Invalid product ID')
];

module.exports = {
    createProductValidation,
    updateProductValidation,
    getProductValidation,
    deleteProductValidation
};
