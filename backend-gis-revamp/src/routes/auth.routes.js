const express = require('express');
const router = express.Router();  // Use the standard Express router
const authController = require('../controllers/auth.controller');
const extractCred = require('../middleware/credMiddleware');


router.get('/checkAuth', extractCred, authController.checkAuth);

module.exports = router;
