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
    const { 
      clientId, 
      lead, 
      dateFrom, 
      dateTo, 
      dateRange, // 'today', 'weekly', 'monthly'
      salesmanId, 
      areaId,
      search,
      page = 1, 
      limit = 20 
    } = req.query;

    let query = { isActive: true };

    // Build date range query
    let dateQuery = {};
    if (dateRange) {
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      
      switch (dateRange) {
        case 'today':
          dateQuery.$gte = startOfDay;
          dateQuery.$lte = endOfDay;
          break;
        case 'weekly':
          const weekAgo = new Date(startOfDay);
          weekAgo.setDate(weekAgo.getDate() - 7);
          dateQuery.$gte = weekAgo;
          dateQuery.$lte = endOfDay;
          break;
        case 'monthly':
          const monthAgo = new Date(startOfDay);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          dateQuery.$gte = monthAgo;
          dateQuery.$lte = endOfDay;
          break;
      }
    } else if (dateFrom || dateTo) {
      if (dateFrom) dateQuery.$gte = new Date(dateFrom);
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        dateQuery.$lte = endDate;
      }
    }

    if (Object.keys(dateQuery).length > 0) {
      query.date = dateQuery;
    }

    if (clientId) {
      query.client = clientId;
    }

    if (lead) query.lead = lead;

    if (salesmanId) {
      query.createdBy = salesmanId;
    }

    // Build client filter combining area and search
    const Client = require('../models/Client');
    let clientQuery = { isActive: true };
    
    if (areaId) {
      clientQuery.area = areaId;
    }
    
    if (search) {
      clientQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (areaId || search) {
      const matchingClients = await Client.find(clientQuery).select('_id');
      if (matchingClients.length > 0) {
        query.client = { $in: matchingClients.map(c => c._id) };
      } else {
        // If no clients match, return empty result
        query.client = { $in: [] };
      }
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

// Export inquiries to Excel (CSV format)
const exportInquiriesToExcel = async (req, res) => {
  try {
    const { 
      clientId, 
      lead, 
      dateFrom, 
      dateTo, 
      dateRange,
      salesmanId, 
      areaId,
      search
    } = req.query;

    // Use the same query logic as getAllFeedback
    let query = { isActive: true };

    // Build date range query
    let dateQuery = {};
    if (dateRange) {
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      
      switch (dateRange) {
        case 'today':
          dateQuery.$gte = startOfDay;
          dateQuery.$lte = endOfDay;
          break;
        case 'weekly':
          const weekAgo = new Date(startOfDay);
          weekAgo.setDate(weekAgo.getDate() - 7);
          dateQuery.$gte = weekAgo;
          dateQuery.$lte = endOfDay;
          break;
        case 'monthly':
          const monthAgo = new Date(startOfDay);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          dateQuery.$gte = monthAgo;
          dateQuery.$lte = endOfDay;
          break;
      }
    } else if (dateFrom || dateTo) {
      if (dateFrom) dateQuery.$gte = new Date(dateFrom);
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        dateQuery.$lte = endDate;
      }
    }

    if (Object.keys(dateQuery).length > 0) {
      query.date = dateQuery;
    }

    if (clientId) {
      query.client = clientId;
    }

    if (lead) query.lead = lead;

    if (salesmanId) {
      query.createdBy = salesmanId;
    }

    // Build client filter combining area and search
    const Client = require('../models/Client');
    let clientQuery = { isActive: true };
    
    if (areaId) {
      clientQuery.area = areaId;
    }
    
    if (search) {
      clientQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (areaId || search) {
      const matchingClients = await Client.find(clientQuery).select('_id');
      if (matchingClients.length > 0) {
        query.client = { $in: matchingClients.map(c => c._id) };
      } else {
        // If no clients match, return empty result
        query.client = { $in: [] };
      }
    }

    // Fetch all matching feedbacks (no pagination for export)
    const feedbacks = await ClientFeedback.find(query)
      .populate({
        path: 'client',
        select: 'name company phone area',
        populate: {
          path: 'area',
          select: 'name city state'
        }
      })
      .populate('createdBy', 'firstName lastName email')
      .populate('products.product', 'productName')
      .sort({ date: -1, createdAt: -1 });

    // Convert to CSV format
    const headers = [
      'Date',
      'Client Name',
      'Company',
      'Phone',
      'Area',
      'Lead Status',
      'Products',
      'Total Quantity',
      'Notes',
      'Created By',
      'Has Audio'
    ];

    const rows = feedbacks.map(feedback => {
      const products = feedback.products && Array.isArray(feedback.products)
        ? feedback.products.map(p => `${p.product?.productName || 'N/A'} (Qty: ${p.quantity || 0})`).join('; ')
        : 'No products';
      
      const totalQuantity = feedback.products && Array.isArray(feedback.products)
        ? feedback.products.reduce((sum, p) => sum + (p.quantity || 0), 0)
        : 0;

      const areaName = feedback.client?.area?.name || 
                      (feedback.client?.area?.city ? `${feedback.client.area.city}, ${feedback.client.area.state}` : 'N/A');

      return [
        feedback.date ? new Date(feedback.date).toLocaleDateString() : '',
        feedback.client?.name || 'N/A',
        feedback.client?.company || '',
        feedback.client?.phone || '',
        areaName,
        feedback.lead || 'N/A',
        products,
        totalQuantity.toString(),
        (feedback.notes || '').replace(/\n/g, ' ').replace(/,/g, ';'),
        feedback.createdBy ? `${feedback.createdBy.firstName || ''} ${feedback.createdBy.lastName || ''}`.trim() : 'N/A',
        feedback.audio?.key ? 'Yes' : 'No'
      ];
    });

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        // Escape commas and quotes in cell values
        const cellStr = String(cell || '');
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(','))
    ].join('\n');

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="inquiries_export_${new Date().toISOString().split('T')[0]}.csv"`);
    
    // Add BOM for Excel UTF-8 support
    res.write('\ufeff');
    res.write(csvContent);
    res.end();
  } catch (error) {
    console.error('Export inquiries error:', error);
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
  getFeedbackStats,
  exportInquiriesToExcel
};
