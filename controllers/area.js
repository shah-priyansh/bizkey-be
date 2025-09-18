const Area = require('../models/Area');


const createArea = async (req, res) => {
  try {
    const { name, description, city, state, stateId, cityId, isActive = true } = req.body;

    // Check if area already exists with same name
    const existingArea = await Area.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    });

    if (existingArea) {
      return res.status(400).json({ 
        success: false, 
        message: 'Area with this name already exists' 
      });
    }

    const area = new Area({
      name,
      description,
      city,
      state,
      stateId,
      cityId,
      isActive
    });

    await area.save();

    res.status(201).json({
      success: true,
      message: 'Area created successfully',
      data: area
    });
  } catch (error) {
    console.error('Create area error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating area',
      error: error.message
    });
  }
};


const getAllAreas = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      city = '', 
      isActive = '' 
    } = req.query;
    
    let query = {};
    
    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // City filter
    if (city) {
      query.city = { $regex: city, $options: 'i' };
    }
    
    // Status filter
    if (isActive !== '') {
      query.isActive = isActive === 'true';
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const areas = await Area.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Area.countDocuments(query);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      message: 'Areas retrieved successfully',
      data: {
        areas,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          total,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get areas error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching areas',
      error: error.message
    });
  }
};


const getAreaById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const area = await Area.findById(id);
    
    if (!area) {
      return res.status(404).json({
        success: false,
        message: 'Area not found'
      });
    }

    res.json({
      success: true,
      message: 'Area retrieved successfully',
      data: area
    });
  } catch (error) {
    console.error('Get area by ID error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'Invalid area ID format'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while fetching area',
      error: error.message
    });
  }
};


const updateArea = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, city, isActive } = req.body;

    // Check if area exists
    const existingArea = await Area.findById(id);
    if (!existingArea) {
      return res.status(404).json({
        success: false,
        message: 'Area not found'
      });
    }

    // Check if new name conflicts with existing area (excluding current area)
    if (name && name !== existingArea.name) {
      const nameConflict = await Area.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: id }
      });

      if (nameConflict) {
        return res.status(400).json({
          success: false,
          message: 'Area with this name already exists'
        });
      }
    }

    const updatedArea = await Area.findByIdAndUpdate(
      id,
      { name, description, city, isActive },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Area updated successfully',
      data: updatedArea
    });
  } catch (error) {
    console.error('Update area error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating area',
      error: error.message
    });
  }
};


const deleteArea = async (req, res) => {
  try {
    const { id } = req.params;
    
    const area = await Area.findById(id);
    
    if (!area) {
      return res.status(404).json({
        success: false,
        message: 'Area not found'
      });
    }

    // Hard delete - permanently remove from database
    await Area.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Area deleted successfully',
      data: { id: area._id, name: area.name }
    });
  } catch (error) {
    console.error('Delete area error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting area',
      error: error.message
    });
  }
};


const toggleAreaStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    const area = await Area.findById(id);
    
    if (!area) {
      return res.status(404).json({
        success: false,
        message: 'Area not found'
      });
    }

    area.isActive = !area.isActive;
    await area.save();

    res.json({
      success: true,
      message: `Area ${area.isActive ? 'activated' : 'deactivated'} successfully`,
      data: area
    });
  } catch (error) {
    console.error('Toggle area status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while toggling area status',
      error: error.message
    });
  }
};
module.exports = {
  createArea,
  getAllAreas,
  getAreaById,
  updateArea,
  deleteArea,
  toggleAreaStatus,
};
