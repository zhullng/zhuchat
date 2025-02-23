const express = require('express');
const { chargeCustomer } = require('../controllers/charge.controller');
const router = express.Router();

router.post('/charge', chargeCustomer);

module.exports = router;
