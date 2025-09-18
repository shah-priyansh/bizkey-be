const State = require('../models/State');

// Get all states
const getAllStates = async (req, res) => {
  try {
    const states = await State.find({ isActive: true }).sort({ name: 1 });
    res.json({
      success: true,
      data: states
    });
  } catch (error) {
    console.error('Error fetching states:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching states',
      error: error.message
    });
  }
};

// Get state by ID
const getStateById = async (req, res) => {
  try {
    const state = await State.findById(req.params.id);
    if (!state) {
      return res.status(404).json({
        success: false,
        message: 'State not found'
      });
    }
    res.json({
      success: true,
      data: state
    });
  } catch (error) {
    console.error('Error fetching state:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching state',
      error: error.message
    });
  }
};

module.exports = {
  getAllStates,
  getStateById,
};
