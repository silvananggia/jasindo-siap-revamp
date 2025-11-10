const express = require('express');
const router = express.Router();  // Use the standard Express router
const anggotaController = require('../controllers/anggota.controller');


router.get('/get-anggota/:id', anggotaController.getAnggota);
router.get('/get-anggota-klaim', anggotaController.getAnggotaKlaim);
router.get('/detail-anggota-klaim', anggotaController.detailAnggotaKlaim);
router.get('/get-detail-peserta', anggotaController.getDetailPeserta);

module.exports = router;
