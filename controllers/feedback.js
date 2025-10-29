const { validationResult } = require('express-validator');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const ClientFeedback = require('../models/ClientFeedback');
const Client = require('../models/Client');
const Product = require('../models/Product');
require('dotenv').config();


const s3Client = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  region: process.env.AWS_REGION
});

const generateSignedUrl = async (req, res) => {
  try {
    const { fileName, fileType } = req.body;

    if (!fileName || !fileType) {
      return res.status(400).json({ message: 'File name and type are required' });
    }

    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/m4a', 'audio/ogg'];
    if (!allowedTypes.includes(fileType)) {
      return res.status(400).json({ message: 'Only audio files are allowed' });
    }

    const key = `client-feedback-audio/${Date.now()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
      ContentType: fileType,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    res.json({
      signedUrl,
      key,
      expiresIn: 300
    });
  } catch (error) {
    console.error('Generate signed URL error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


const getSignedUrlForDownload = async (key, expire = 300) => {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: key,
  });
  return getSignedUrl(s3Client, command, { expiresIn: expire });
}

const createFeedback = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id, client, lead, date, products, audio, notes } = req.body;

    // If ID is provided, update existing feedback
    if (id) {
      let query = { _id: id, isActive: true };

      if (req.user?.role === 'salesman') {
        const clientIds = await Client.find({ area: req.user.area, isActive: true }).select('_id');
        query.client = { $in: clientIds.map(c => c._id) };
      }

      const existingFeedback = await ClientFeedback.findOne(query);
      if (!existingFeedback) {
        return res.status(404).json({ message: 'Feedback not found' });
      }

      if (req.user?.role === 'salesman' && existingFeedback.createdBy.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Validate client if provided
      if (client) {
        const clientExists = await Client.findById(client);
        if (!clientExists) {
          return res.status(400).json({ message: 'Client not found' });
        }

        if (req.user?.role === 'salesman' && clientExists.area.toString() !== req.user.area.toString()) {
          return res.status(403).json({ message: 'Access denied to this client' });
        }
      }

      // Validate products if provided
      if (products) {
        if (!Array.isArray(products) || products.length === 0) {
          return res.status(400).json({ message: 'At least one product is required' });
        }

        for (const productItem of products) {
          if (!productItem.product || !productItem.quantity) {
            return res.status(400).json({ message: 'Each product must have product ID and quantity' });
          }

          const productExists = await Product.findById(productItem.product);
          if (!productExists) {
            return res.status(400).json({ message: `Product with ID ${productItem.product} not found` });
          }

          if (productItem.quantity < 0) {
            return res.status(400).json({ message: 'Product quantity must be 0 or greater' });
          }
        }
      }

      // Update the feedback
      const updateData = {};
      if (client) updateData.client = client;
      if (lead !== undefined) updateData.lead = lead;
      if (date) updateData.date = date;
      if (products) updateData.products = products;
      updateData.audio = audio;
      if (notes !== undefined) updateData.notes = notes;

      const updatedFeedback = await ClientFeedback.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).populate('client', 'name company phone')
        .populate('createdBy', 'firstName lastName email')
        .populate('products.product', 'productName');

      return res.json(updatedFeedback);
    }

    // Create new feedback (existing logic)
    const clientExists = await Client.findById(client);
    if (!clientExists) {
      return res.status(400).json({ message: 'Client not found' });
    }

    if (req.user?.role === 'salesman' && clientExists.area.toString() !== req.user.area.toString()) {
      return res.status(403).json({ message: 'Access denied to this client' });
    }

    // Validate products
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: 'At least one product is required' });
    }

    // Validate each product
    for (const productItem of products) {
      if (!productItem.product || !productItem.quantity) {
        return res.status(400).json({ message: 'Each product must have product ID and quantity' });
      }

      const productExists = await Product.findById(productItem.product);
      if (!productExists) {
        return res.status(400).json({ message: `Product with ID ${productItem.product} not found` });
      }

      if (productItem.quantity < 0) {
        return res.status(400).json({ message: 'Product quantity must be 0 or greater' });
      }
    }

    const feedback = new ClientFeedback({
      client,
      lead,
      date: date || new Date(),
      products,
      audio,
      notes,
      createdBy: req.user.id
    });

    await feedback.save();

    const feedbackResponse = await ClientFeedback.findById(feedback._id)
      .populate('client', 'name company phone')
      .populate('createdBy', 'firstName lastName email')
      .populate('products.product', 'productName');

    res.status(201).json(feedbackResponse);
  } catch (error) {
    console.error('Create feedback error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAllFeedback = async (req, res) => {
  try {
    const { clientId, lead, dateFrom, dateTo, page = 1, limit = 20 } = req.query;

    let query = { isActive: true };

    if (clientId) {
      // If client ID is provided, filter by that specific client
      query.client = clientId ;
      
      // For salesmen, also verify they have access to this client
      if (req.user?.role === 'salesman') {
        const clientExists = await Client.findById(clientId);
        if (!clientExists || clientExists.area.toString() !== req.user.area.toString()) {
          return res.status(403).json({ message: 'Access denied to this client' });
        }
      }
    } else if (req.user?.role === 'salesman') {
      // If no client specified and user is salesman, filter by their area
      const clientIds = await Client.find({ area: req.user.area, isActive: true }).select('_id');
      query.client = { $in: clientIds.map(c => c._id) };
    }

    if (lead) query.lead = lead;

    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = new Date(dateFrom);
      if (dateTo) query.date.$lte = new Date(dateTo);
    }

    const feedback = await ClientFeedback.find(query)
      .populate('client', 'name company phone area')
      .populate('createdBy', 'firstName lastName email')
      .populate('products.product', 'productName')
      .sort({ date: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await ClientFeedback.countDocuments(query);

    res.json({
      feedback,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getFeedbackByClient = async (req, res) => {
  try {
    const { client, page = 1, limit = 20 } = req.query;

    const feedback = await ClientFeedback.find({ client, isActive: true })
      .populate('client', 'name company phone area')
      .populate('createdBy', 'firstName lastName email')
      .populate('products.product', 'productName')
      .sort({ date: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await ClientFeedback.countDocuments({ client, isActive: true });

    res.json({
      feedback,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Get feedback by client error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getFeedbackById = async (req, res) => {
  try {
    const { id } = req.params;

    let query = { _id: id, isActive: true };

    if (req.user?.role === 'salesman') {
      const clientIds = await Client.find({ area: req.user.area, isActive: true }).select('_id');
      query.client = { $in: clientIds.map(c => c._id) };
    }

    const feedback = await ClientFeedback.findOne(query)
      .populate('client', 'name company phone area')
      .populate('createdBy', 'firstName lastName email')
      .populate('products.product', 'productName');

    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }

    res.json(feedback);
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateFeedback = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updateData = req.body;

    let query = { _id: id, isActive: true };

    if (req.user?.role === 'salesman') {
      const clientIds = await Client.find({ area: req.user.area, isActive: true }).select('_id');
      query.client = { $in: clientIds.map(c => c._id) };
    }

    const existingFeedback = await ClientFeedback.findOne(query);
    if (!existingFeedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }

    if (req.user?.role === 'salesman' && existingFeedback.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const feedback = await ClientFeedback.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('client', 'name company phone area')
      .populate('createdBy', 'firstName lastName email')
      .populate('products.product', 'productName');

    res.json(feedback);
  } catch (error) {
    console.error('Update feedback error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteFeedback = async (req, res) => {
  try {
    const { id } = req.params;

    let query = { _id: id, isActive: true };

    if (req.user?.role === 'salesman') {
      const clientIds = await Client.find({ area: req.user.area, isActive: true }).select('_id');
      query.client = { $in: clientIds.map(c => c._id) };
    }

    const existingFeedback = await ClientFeedback.findOne(query);
    if (!existingFeedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }

    if (req.user?.role === 'salesman' && existingFeedback.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const feedback = await ClientFeedback.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    res.json({ message: 'Feedback deleted successfully' });
  } catch (error) {
    console.error('Delete feedback error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getFeedbackStats = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;

    let matchQuery = { isActive: true };

    if (req.user?.role === 'salesman') {
      const clientIds = await Client.find({ area: req.user.area, isActive: true }).select('_id');
      matchQuery.client = { $in: clientIds.map(c => c._id) };
    }

    if (dateFrom || dateTo) {
      matchQuery.date = {};
      if (dateFrom) matchQuery.date.$gte = new Date(dateFrom);
      if (dateTo) matchQuery.date.$lte = new Date(dateTo);
    }

    const stats = await ClientFeedback.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$lead',
          count: { $sum: 1 },
          totalQuantity: { $sum: { $sum: '$products.quantity' } }
        }
      }
    ]);

    const totalFeedback = await ClientFeedback.countDocuments(matchQuery);

    res.json({
      leadStats: stats,
      totalFeedback,
      dateRange: { dateFrom, dateTo }
    });
  } catch (error) {
    console.error('Get feedback stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Generate signed URL for audio playback
const generateAudioPlaybackUrl = async (req, res) => {
  try {
    const { feedbackId } = req.params;

    // Find the feedback record
    const feedback = await ClientFeedback.findById(feedbackId);
    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }

    // Check if feedback has audio
    if (!feedback.audio || !feedback.audio.key) {
      return res.status(400).json({ message: 'No audio file found for this feedback' });
    }

    // Generate signed URL for audio playback (valid for 1 hour)
    const signedUrl = await getSignedUrlForDownload(feedback.audio.key, 3600);

    res.json({
      signedUrl,
      key: feedback.audio.key,
      originalName: feedback.audio.originalName,
      expiresIn: 3600
    });
  } catch (error) {
    console.error('Generate audio playback URL error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  generateSignedUrl,
  getSignedUrlForDownload,
  generateAudioPlaybackUrl,
  createFeedback,
  getAllFeedback,
  getFeedbackByClient,
  getFeedbackById,
  updateFeedback,
  deleteFeedback,
  getFeedbackStats
};
