const express = require('express');
const router = express.Router();  // Use the standard Express router
const petakAnalisisController = require('../controllers/petakAnalisis.controller');


router.get('/tanam-petak/:id', petakAnalisisController.getTanamPetak)
router.get('/ndpi-petak/:id', petakAnalisisController.getNDPIAnalisis)
router.get('/water-petak/:id', petakAnalisisController.getWaterAnalisis)
router.get('/bare-petak/:id', petakAnalisisController.getBareAnalisis)

module.exports = router;
