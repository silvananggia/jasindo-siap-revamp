const express = require('express');
const router = express.Router();  // Use the standard Express router
const anggotaController = require('../controllers/anggota.controller');


router.get('/get-anggota/:id', anggotaController.getAnggota);
router.get('/get-anggota-disetujui/:id', anggotaController.getAnggotaDisetujui);
router.get('/get-anggota-klaim/:idkelompok/:idklaim', anggotaController.getAnggotaKlaim);

module.exports = router;
