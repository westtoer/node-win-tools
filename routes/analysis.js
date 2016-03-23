/*jslint node: true */
/*jslint nomen: true */
"use strict";

var express = require('express'),
    pdf = require('html-pdf'),
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
        winconf._dump = DUMP.create(winconf);
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
        "menu" : 'search',
        "mount": req.baseUrl,
        "dump"  : res.dump,
        "windumps": req.app.locals.options.windumps
    });
});


router.param('windump', function (req, res, next, windump) {
    res.dump = getDump(req, windump);
    next();
});


module.exports = router;
