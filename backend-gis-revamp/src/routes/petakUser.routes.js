const express = require('express');
const router = express.Router();  // Use the standard Express router
const petakUserController = require('../controllers/petakUser.controller');


router.post('/save-petak', petakUserController.savePetakUser)
router.get('/petak-user/:id', petakUserController.listPetakUser)
router.get('/point-petak-user/:id', petakUserController.pointPetakUser)
router.get('/list-point-petak-user/:id', petakUserController.listPointPetakUser)
router.get('/petakid/:id', petakUserController.petakId)
router.get('/center-petak-user/:id', petakUserController.centerPetakUser)
router.get('/petak-by-id/:id', petakUserController.getPetakById)
router.get('/petak-by-idpetak/:id', petakUserController.getPetakByIdPetak)
router.get('/petak-geojson', petakUserController.getPetakUserByNikGeoJSON)
router.get('/check-percil-availability', petakUserController.checkPercilAvailability)
router.delete('/petak/:id', petakUserController.deletePetakUser)

module.exports = router;
