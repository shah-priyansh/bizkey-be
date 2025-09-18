const express = require('express');
const router = express.Router();
const {
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    getProductStats,
    toggleProductStatus
} = require('../controllers/product');
const {
    createProductValidation,
    updateProductValidation,
    getProductValidation,
    deleteProductValidation
} = require('../validations/product');
const { auth } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(auth);

// Get all products with pagination and search
router.get('/', getAllProducts);

// Get product statistics
router.get('/stats', getProductStats);

// Get single product by ID
router.get('/:id', getProductValidation, getProductById);

// Create new product
router.post('/', createProductValidation, createProduct);

// Update product
router.put('/:id', updateProductValidation, updateProduct);

// Delete product
router.delete('/:id', deleteProductValidation, deleteProduct);

// Toggle product status
router.patch('/:id/toggle-status', getProductValidation, toggleProductStatus);

module.exports = router;
