const City = require('../models/City');
const State = require('../models/State');

// Get all cities
const getAllCities = async (req, res) => {
  try {
    const cities = await City.find({ isActive: true })
      .populate('state', 'name code')
      .sort({ name: 1 });
    
    res.json({
      success: true,
      data: cities
    });
  } catch (error) {
    console.error('Error fetching cities:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching cities',
      error: error.message
    });
  }
};

// Get cities by state
const getCitiesByState = async (req, res) => {
  try {
    const { stateId } = req.params;
    
    // Verify state exists
    const state = await State.findById(stateId);
    if (!state) {
      return res.status(404).json({
        success: false,
        message: 'State not found'
      });
    }

    const cities = await City.find({ 
      state: stateId, 
      isActive: true 
    }).sort({ name: 1 });
    
    res.json({
      success: true,
      data: cities,
      state: {
        id: state._id,
        name: state.name,
        code: state.code
      }
    });
  } catch (error) {
    console.error('Error fetching cities by state:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching cities by state',
      error: error.message
    });
  }
};

module.exports = {
  getAllCities,
  getCitiesByState,
};
