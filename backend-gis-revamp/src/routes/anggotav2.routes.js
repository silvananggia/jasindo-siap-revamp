const express = require('express');
const router = express.Router();  // Use the standard Express router
const anggotav2Controller = require('../controllers/anggotav2.controller');


router.get('/get-anggota-klaim', anggotav2Controller.getAnggotaKlaimById);
router.get('/detail-anggota-klaim', anggotav2Controller.detailAnggotaKlaimById);

module.exports = router;
