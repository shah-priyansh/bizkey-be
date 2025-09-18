const express = require('express');
const { salesmanAuth } = require('../middleware/auth');
const Client = require('../models/Client');
const User = require('../models/User');

const router = express.Router();

router.get('/profile', salesmanAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('area', 'name city state');
    
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/salesmen/profile
// @desc    Update salesman profile
// @access  Private (Salesman only)
router.put('/profile', salesmanAuth, async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;
    
    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone) updateData.phone = phone;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password').populate('area', 'name city state');

    res.json(user);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/salesmen/clients
// @desc    Get clients assigned to salesman's area
// @access  Private (Salesman only)
router.get('/clients', salesmanAuth, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    
    let query = { 
      area: req.user.area,
      isActive: true 
    };
    
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const clients = await Client.find(query)
      .populate('area', 'name city state')
      .sort({ name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Client.countDocuments(query);

    res.json({
      clients,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/salesmen/clients/:id
// @desc    Get specific client details
// @access  Private (Salesman only)
router.get('/clients/:id', salesmanAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const client = await Client.findOne({
      _id: id,
      area: req.user.area,
      isActive: true
    }).populate('area', 'name city state');

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json(client);
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/salesmen/dashboard
// @desc    Get salesman dashboard stats
// @access  Private (Salesman only)
router.get('/dashboard', salesmanAuth, async (req, res) => {
  try {
    const totalClients = await Client.countDocuments({
      area: req.user.area,
      isActive: true
    });

    const clientsByStatus = await Client.aggregate([
      {
        $match: {
          area: req.user._id,
          isActive: true
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const recentClients = await Client.find({
      area: req.user.area,
      isActive: true
    })
    .select('name company status createdAt')
    .sort({ createdAt: -1 })
    .limit(5);

    const statusCounts = {};
    clientsByStatus.forEach(item => {
      statusCounts[item._id] = item.count;
    });

    res.json({
      stats: {
        totalClients,
        statusCounts
      },
      recentClients
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/salesmen/clients/:id/update-status
// @desc    Update client status (for tracking purposes)
// @access  Private (Salesman only)
router.post('/clients/:id/update-status', salesmanAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const client = await Client.findOneAndUpdate(
      {
        _id: id,
        area: req.user.area,
        isActive: true
      },
      {
        status,
        notes: notes ? notes : undefined,
        lastContact: new Date()
      },
      { new: true }
    ).populate('area', 'name city state');

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json(client);
  } catch (error) {
    console.error('Update client status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/salesmen/area-info
// @desc    Get salesman's area information
// @access  Private (Salesman only)
router.get('/area-info', salesmanAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('area', 'name city state description coordinates');
    
    if (!user.area) {
      return res.status(404).json({ message: 'No area assigned' });
    }

    res.json(user.area);
  } catch (error) {
    console.error('Get area info error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
