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
        title: 'webcams',
        fluid: true,
        menu: false,
        options: req.app.locals.options
    };
    res.render('cams', pageData);
});

module.exports = router;
