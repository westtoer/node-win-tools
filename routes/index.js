/*jslint node: true*/
"use strict";

var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', { title: 'win-tools', menu: 'home' });
});

/* GET about page. */
router.get('/about', function (req, res, next) {
    res.render('about', { title: 'about win-tools', menu: 'about' });
});

/* GET samples page. */
router.get('/samples', function (req, res, next) {
    var SAMPLEIDS = [49928, 33346, 53249, 53302, 53303, 53304, 53306, 53307, 53308, 53309, 53310, 53311, 53312, 53313, 53314, 53315, 53381, 53382, 53383, 53384],
        samples = SAMPLEIDS.map(function (id) {return {id: id, lbl: "sample-" + id}; });

    res.render('samples', { title: 'samples managed in the win', menu: 'shortcuts', samples: samples });
});

module.exports = router;
