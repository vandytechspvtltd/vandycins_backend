const express = require('express');
const controller = require('../controllers/drugRegistryController');

const router = express.Router();
const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.get('/search', asyncHandler(controller.searchDrugs));
router.get('/brand/:brandIdentifier', asyncHandler(controller.brandDetails));
router.get('/generic/:genericIdentifier', asyncHandler(controller.genericDetails));
router.get('/supplier/:supplierIdentifier', asyncHandler(controller.supplierDetails));
router.get('/substance/:substanceIdentifier', asyncHandler(controller.substanceDetails));

module.exports = router;
