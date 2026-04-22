const express = require('express');
const router = express.Router();
const { search } = require('./search.controller');

router.get('/', search);

module.exports = router;
