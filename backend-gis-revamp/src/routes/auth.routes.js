const express = require('express');
const router = express.Router();  // Use the standard Express router
const authController = require('../controllers/auth.controller');


router.get('/checkAuth', authController.checkAuth);

module.exports = router;
