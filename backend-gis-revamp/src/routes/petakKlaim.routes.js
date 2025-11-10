const express = require('express');
const router = express.Router();  // Use the standard Express router
const petakKlaimController = require('../controllers/petakKlaim.controller');


router.post('/save-petak-klaim', petakKlaimController.savePetakKlaim)
router.get('/petak-user-klaim/:id/:nopolis', petakKlaimController.listPetakKlaim)
router.get('/klaimid/:id', petakKlaimController.klaimId)
router.get('/petak-klaim-id/:id', petakKlaimController.getPetakKlaimID)
router.get('/petak-klaim-geojson', petakKlaimController.getPetakKlaimByNikGeoJSON)
router.delete('/petak-klaim/:id', petakKlaimController.deletePetakKlaim)

module.exports = router;
