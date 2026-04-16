const express = require('express');
const router = express.Router();
const Hospital = require('../models/Hospital');

// Search hospitals
router.get('/', async (req, res) => {
  try {
    const { city, department, emergency, search } = req.query;
    const filters = {};
    if (city) filters.city = city;
    if (department) filters.department = department;
    if (emergency === 'true') filters.emergency = true;
    if (search) filters.search = search;

    const hospitals = await Hospital.findAll(filters);
    res.json({ success: true, hospitals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Nearby hospitals
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, maxDistance = 10000 } = req.query;
    if (!lat || !lng) {
      return res.json({ success: true, hospitals: [] });
    }
    const hospitals = await Hospital.findNearby(
      parseFloat(lat),
      parseFloat(lng),
      parseInt(maxDistance)
    );
    res.json({ success: true, hospitals });
  } catch (error) {
    res.json({ success: true, hospitals: [] });
  }
});

// Get hospital by ID
router.get('/:id', async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    res.json({ success: true, hospital });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
