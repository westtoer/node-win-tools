/*jslint node: true*/
"use strict";

var express = require('express'),
    router = express.Router(),
    options = {};


/* middleware logging and checking */
//router.use(function (req, res, next) {
//    console.log('%s %s %s %j', req.method, req.url, req.path, req.app.locals.options);
//    next();
//});

/* GET home page. */
router.get('/', function (req, res, next) {
    var pageData = {
        title: 'win-tools',
        menu: 'home',
        options: req.app.locals.options
    };
    res.render('index', pageData);
});

/* GET reload page. */
router.get('/reload', function (req, res, next) {
    req.app.locals.reloadOptions();
    res.redirect('/');
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
