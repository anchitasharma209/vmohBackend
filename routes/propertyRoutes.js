const express = require('express');
const router= express.Router();
const property = require('../controllers/propertyControllers.js');
const verifyToken = require('../middlewares/auth.js');

router.post('/createlist',[verifyToken],property.createList);
router.put('/updateproperty/:id',[verifyToken],property.updatedProperty)
router.get('/getallcities',[verifyToken],property.getAllCities);
router.get('/getallproperties',[verifyToken],property.getAllProperties);
router.get('/getpropertybyCity/:city',[verifyToken],property.getPropertyByCity);

module.exports = router;