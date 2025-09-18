const Product = require('../models/Product');

// Get all products with pagination and search
const getAllProducts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const isActive = req.query.isActive;

        // Build query
        let query = {};
        
        if (search) {
            query.productName = { $regex: search, $options: 'i' };
        }
        
        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        }

        // Calculate pagination
        const skip = (page - 1) * limit;

        // Get products with pagination
        const products = await Product.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Get total count for pagination
        const totalProducts = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / limit);

        res.status(200).json({
            success: true,
            data: {
                products,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalItems: totalProducts,
                    itemsPerPage: limit
                }
            }
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch products',
            error: error.message
        });
    }
};

// Get single product by ID
const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.status(200).json({
            success: true,
            data: product
        });
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch product',
            error: error.message
        });
    }
};

// Create new product
const createProduct = async (req, res) => {
    try {
        const { productName, isActive = true } = req.body;

        // Check if product with same name already exists
        const existingProduct = await Product.findOne({ 
            productName: { $regex: new RegExp(`^${productName}$`, 'i') } 
        });

        if (existingProduct) {
            return res.status(400).json({
                success: false,
                message: 'Product with this name already exists'
            });
        }

        const product = new Product({
            productName,
            isActive
        });

        await product.save();

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: product
        });
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create product',
            error: error.message
        });
    }
};

// Update product
const updateProduct = async (req, res) => {
    try {
        const { productName, isActive } = req.body;
        const productId = req.params.id;

        // Check if product exists
        const existingProduct = await Product.findById(productId);
        if (!existingProduct) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Check if product name is being changed and if new name already exists
        if (productName && productName !== existingProduct.productName) {
            const duplicateProduct = await Product.findOne({ 
                productName: { $regex: new RegExp(`^${productName}$`, 'i') },
                _id: { $ne: productId }
            });

            if (duplicateProduct) {
                return res.status(400).json({
                    success: false,
                    message: 'Product with this name already exists'
                });
            }
        }

        // Update product
        const updatedProduct = await Product.findByIdAndUpdate(
            productId,
            { productName, isActive },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Product updated successfully',
            data: updatedProduct
        });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update product',
            error: error.message
        });
    }
};

// Delete product
const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        await Product.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete product',
            error: error.message
        });
    }
};

// Get product statistics
const getProductStats = async (req, res) => {
    try {
        const totalProducts = await Product.countDocuments();
        const activeProducts = await Product.countDocuments({ isActive: true });
        const inactiveProducts = await Product.countDocuments({ isActive: false });

        res.status(200).json({
            success: true,
            data: {
                totalProducts,
                activeProducts,
                inactiveProducts
            }
        });
    } catch (error) {
        console.error('Error fetching product stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch product statistics',
            error: error.message
        });
    }
};

// Toggle product status
const toggleProductStatus = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Toggle the status
        product.isActive = !product.isActive;
        await product.save();

        res.status(200).json({
            success: true,
            message: `Product ${product.isActive ? 'activated' : 'deactivated'} successfully`,
            data: product
        });
    } catch (error) {
        console.error('Error toggling product status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle product status',
            error: error.message
        });
    }
};

module.exports = {
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    getProductStats,
    toggleProductStatus
};
