const { validationResult } = require('express-validator');
const Client = require('../models/Client');
const Area = require('../models/Area');
const User = require('../models/User');

const createClient = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, company, email, phone, address, area, status, notes } = req.body;

    const areaExists = await Area.findById(area);
    if (!areaExists) {
      return res.status(400).json({ message: 'Area not found' });
    }

    const client = new Client({
      name,
      company,
      email,
      phone,
      address,
      area,
      notes,
    });

    await client.save();

    const clientResponse = await Client.findById(client._id)
      .populate('area', 'name city state')

    res.status(201).json(clientResponse);
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getClients = async (req, res) => {
  try {
    const { area, status, search, page = 1, limit = 20 } = req.query;
    
    let query = {  };
    
    if (req.user?.role === 'salesman') {
      query.area = req.user.area;
      query.isActive = true;
    } else if (area) {
      query.area = area;
    }
    
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const clients = await Client.find(query)
      .populate('area', 'name city state')
      .sort({ createdAt: -1 })
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
};

const getClientById = async (req, res) => {
  try {
    const { id } = req.params;
    
    let query = { _id: id, isActive: true };
    
    if (req.user.role === 'salesman') {
      query.area = req.user.area;
    }

    const client = await Client.findOne(query)
      .populate('area', 'name city state')

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json(client);
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateClient = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updateData = req.body;

    if (updateData.area) {
      const areaExists = await Area.findById(updateData.area);
      if (!areaExists) {
        return res.status(400).json({ message: 'Area not found' });
      }
    }


    const client = await Client.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('area', 'name city state')

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json(client);
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;
    
    const client = await Client.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json({ message: 'Client deactivated successfully' });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const assignSalesman = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { salesmanId } = req.body;

    const salesman = await User.findById(salesmanId);
    if (!salesman || salesman.role !== 'salesman' || !salesman.isActive) {
      return res.status(400).json({ message: 'Invalid salesman' });
    }

    const client = await Client.findByIdAndUpdate(
      id,
      { new: true }
    ).populate('area', 'name city state')

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json(client);
  } catch (error) {
    console.error('Assign salesman error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

    
const toggleClientStatus = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Toggling status for client ID:', id);

    const client = await Client.findById(id);

    if (!client) {
      console.log('Client not found with ID:', id);
      return res.status(404).json({ message: 'Client not found' });
    }

    const previousStatus = client.isActive;
    client.isActive = !client.isActive;
    await client.save();

    console.log(`Client ${client.name} status changed from ${previousStatus} to ${client.isActive}`);

    res.json({
      message: `Client ${client.isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        _id: client._id,
        isActive: client.isActive,
        name: client.name
      }
    });
  } catch (error) {
    console.error('Toggle client status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient,
  assignSalesman,
  toggleClientStatus
};
