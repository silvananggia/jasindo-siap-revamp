const express = require('express');
const router = express.Router();  // Use the standard Express router
const petakController = require('../controllers/petak.controller');


router.get('/petak', petakController.listAllPetak)

module.exports = router;
