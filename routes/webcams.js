/*jslint node: true*/
/*jslint regexp: true*/
"use strict";

var express = require('express'),
    phantom = require('phantom'),
    webagent,
    cheerio = require('cheerio'),
    router = express.Router(),
    options = {},
    INTERVAL = 5 * 60 * 1000,
    DELTA = 100,
    launchDelta = 100,
    METEO_BASE_URL = "http://www.meteo.be",
    PAGES = {
        "melle" : METEO_BASE_URL + "/meteo/view/nl/2359771-Webcam+Melle.html",
        "ukkel" : METEO_BASE_URL + "/meteo/view/nl/1586624-Webcam+Uccle.html"
    },
    CAMS = ["blankenberge", "bredene", "dehaanwenduine", "depanne", "knokkeheist", "koksijdeoostduinkerke",
            "middelkerkewestende", "nieuwpoort", "oostende", "zeebrugge" ],
    PLAYER = "http://ipcamlive.com/player/player.php?alias=",
    REGEXP_SCRIPT = /var\s*address\s*=\s*'([^']*)';\s*var\s*streamid\s*=\s*'([^']*)';/im,
    processCache = {};


function grabPageContentToProcess(url, contentFn) {
    var page, status;
    // use phantom instance to get the page
    webagent.createPage().then(function (page) {
        console.log("loading %s", url);
        page.open(url).then(function (status) {
            if (status !== 'success') {
                console.log("Failed to load url ==> (%s) @ %s", status, url);
            }
            page.property('content').then(function (content) {
                // find the snapshot/image
                page.evaluate(function () {
                    return document.documentElement.innerHTML;
                }).then(function (doc) {
                    contentFn(cheerio.load(doc));
                });
            });
        });
    });
}

function updatePage(alias) {
    grabPageContentToProcess(PAGES[alias], function ($) {
        var $img = $('div.image > img').last(), // grab last image in the class-decorated div
            imgsrc = METEO_BASE_URL +  $img.attr('src'); // get its src attr
        
        processCache[alias].setImgSrc(imgsrc);
    });
}

function updateCam(alias) {
    grabPageContentToProcess(PLAYER + alias, function ($) {
        var script = $('script:not([src])').first().html(),
            match = REGEXP_SCRIPT.exec(script),
            address,
            streamid,
            imgsrc;
        
        if (!match) {
            console.log("script doesn't match pattern for address and streamid");
            imgsrc = null;
        } else {
            address = match[1];
            streamid = match[2];
            if (streamid === null || streamid === undefined || streamid.length === 0) {
                imgsrc = 'http://new.ipcamlive.com/player/connecting.gif';
            } else {
                imgsrc = address + '/streams/' + streamid + '/snapshot.jpg';
            }
        }
        processCache[alias].setImgSrc(imgsrc);
    });
}

function AliasCache(alias, plyref, updateFn) {
    this.alias = alias;
    this.plyref = plyref;
    this.fetchUpdate = updateFn;
    this.imgsrc = null;
    this.handle = null;
    this.updts = null;
    
    console.log("1st schedule for %s at %d", alias, launchDelta);
    this.schedule(launchDelta);
    launchDelta += DELTA;
}
AliasCache.prototype.setImgSrc = function (src) {
    this.imgsrc = src;
    this.updts = Date.now();
    console.log("updated img for '%s' ==>  %s", this.alias, this.imgsrc);
    this.repeat();
};
AliasCache.prototype.repeat = function () {
    this.schedule(INTERVAL);
};
AliasCache.prototype.schedule = function (at) {
    setTimeout(this.fetchUpdate, at);
};
AliasCache.prototype.asDO = function () {
    return {
        "alias"    : this.alias,
        "image"    : this.imgsrc,
        "updatets" : this.updts,
        "player"   : this.plyref
    };
};

function initAlias(alias, plyref, updateFn) {
    processCache[alias] = new AliasCache(alias, plyref, updateFn);
}

function init() {
    console.log("initialising the phantom");
    phantom.create(['--ignore-ssl-errors=yes', '--load-images=no']).then(function (instance) {
        webagent = instance;
        Object.keys(PAGES).forEach(function (alias) {
            initAlias(alias, PAGES[alias], function () { updatePage(alias); });
        });

        CAMS.forEach(function (alias) {
            initAlias(alias, PLAYER + alias + '&autoplay=true', function () { updateCam(alias); });
        });
    });
}

init();

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

router.get('/cams.json', function (req, res, next) {
    var cams = Object.keys(processCache).reduce(function (res, elm, ndx) {
        res[elm] = processCache[elm].asDO();
        return res;
    }, {});
    res.json(cams);
});

router.get('/:alias', function (req, res, next) {
    var alias = req.camAlias;
    res.json(processCache[alias].asDO());
});

/* TODO: only do this if we need a local cache
router.get('/:alias/snapshot.jpg', function (req, res, next) {
    console.log("retrieval for %s - JPG", req.camAlias);
    // fornow
    next();
    // todo
    // send image! + set mimetype header
    // stream.pipe(res);
});
*/

router.param('alias', function (req, res, next, alias) {
    req.camAlias = alias;
    next();
});

router.shutdown = function () {
    console.log("shutting down the phantom");
    phantom.exit();
    Object.keys(processCache).forEach(function (alias) {
        if (processCache[alias].handle) {
            clearTimeout(processCache[alias].handle);
        }
    });
};

module.exports = router;
