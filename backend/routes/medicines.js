const express = require('express');
const router = express.Router();
const Medicine = require('../models/Medicine');
const { callGeminiAgent } = require('../services/aiService');

// Search medicines
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ success: true, medicines: [] });
    const medicines = await Medicine.search(q);

    // If no DB results, use AI
    if (medicines.length === 0) {
      const aiResult = await callGeminiAgent('medicineAdvisor', q);
      return res.json({ success: true, medicines: [], aiResponse: aiResult.data });
    }

    res.json({ success: true, medicines });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get medicine info via AI
router.post('/ask', async (req, res) => {
  try {
    const { question } = req.body;
    const result = await callGeminiAgent('medicineAdvisor', question);
    res.json({ success: true, response: result.data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get medicine by name
router.get('/:name', async (req, res) => {
  try {
    const medicine = await Medicine.findByName(req.params.name);
    if (!medicine) {
      const aiResult = await callGeminiAgent('medicineAdvisor', `Tell me about ${req.params.name}`);
      return res.json({ success: true, medicine: null, aiResponse: aiResult.data });
    }
    res.json({ success: true, medicine });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
