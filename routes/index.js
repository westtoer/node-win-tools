/*jslint node: true*/
"use strict";

var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', { title: 'win-tools', menu: 'home' });
});

module.exports = router;
