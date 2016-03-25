/*jslint node: true */
/*jslint nomen: true */
"use strict";

var express = require('express'),
    pdf = require('html-pdf'),
    path = require('path'),
    DUMP = require('../lib/windump'),
    util = require('util'),
    router = express.Router();


function getWindumps(req, name) {
    var dumps = req.app.locals.options.windumps;
    if (name === undefined || !(dumps.hasOwnProperty(name))) {
        return dumps;
    } //else
    return dumps[name];
}

function getDefaultWindump(req) {
    return getWindumps(req)._default;
}

function getDump(req, name) {
    var winconf = getWindumps(req, name),
        dump;

    if (winconf._dump === undefined) {
        winconf._dump = DUMP.create(path.join(__dirname, ".."), winconf);
        winconf._dump._name = name;
    }
    dump = winconf._dump;
    return dump;
}

/* GET search page. */
router.get('/', function (req, res, next) {
    res.redirect(req.baseUrl + '/' + getDefaultWindump(req));
});

router.get('/:windump', function (req, res, next) {
    res.render('analysis', {
        "title": 'win-tools::analysis ' + res.dump._name,
        "menu" : 'analyse',
        "mount": req.baseUrl,
        "dump"  : res.dump,
        "windumps": req.app.locals.options.windumps
    });
});

router.get('/:windump/:fn-:check', function (req, res, next) {
    res.dump[res.fn](res.check);
    res.redirect(req.baseUrl + "/" + res.dump._name);
});

router.get('/:windump/result/:check', function (req, res, next) {
    res.render('analysis-result-' + res.check, {
        "title": 'win-tools::analysis ' + res.dump._name + ' - ' + res.check,
        "menu" : 'analyse',
        "mount": req.baseUrl,
        "dump" : res.dump,
        "check": res.check,
        "tjk"  : res.dump.check[res.check],
        "results": res.dump.check[res.check].results
    });
});

router.param('windump', function (req, res, next, windump) {
    res.dump = getDump(req, windump);
    next();
});

router.param('check', function (req, res, next, check) {
    res.check = check;
    next();
});

router.param('fn', function (req, res, next, fn) {
    res.fn = fn;
    next();
});


module.exports = router;
