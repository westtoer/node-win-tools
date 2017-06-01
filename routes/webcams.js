/*jslint node: true*/
/*jslint regexp: true*/
"use strict";

var express = require('express'),
    phantom = require('phantom'),
    moment = require('moment'),
    util = require('util'),
    webagent,
    cheerio = require('cheerio'),
    router = express.Router(),
    options = {},
    INTERVAL = 60 * 1000,
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
    NO_CONNECTION_GIF = 'http://new.ipcamlive.com/player/connecting.gif',
    REGEXP_SCRIPT = /var\s*address\s*=\s*'([^']*)';\s*var\s*streamid\s*=\s*'([^']*)';/im,
    processCache = {};


function camPlayerRef(alias) {
    return PLAYER + alias + '&autoplay=true';
}

function grabPageContentToProcess(url, contentFn) {
    var page, status;
    // use phantom instance to get the page
    webagent.createPage().then(function (page) {
        console.log("loading %s", url);
        page.open(url).then(function (status) {
            if (status !== 'success') {
                console.log("Failed to load url ==> (%s) @ %s", status, url);
                contentFn();
            } else {
                page.property('content').then(function (content) {
                    // find the snapshot/image
                    page.evaluate(function () {
                        return document.documentElement.innerHTML;
                    }).then(function (doc) {
                        contentFn(cheerio.load(doc));
                    });
                });
            }
        });
    });
}

function updatePage(alias) {
    grabPageContentToProcess(PAGES[alias], function ($) {
        var $img, success = false, imgsrc = null;
        try {
            if ($ !== undefined) {
                $img = $('div.image > img').last(); // grab last image in the class-decorated div
                imgsrc = $img.attr('src');

                if (imgsrc !== undefined && imgsrc !== null && imgsrc.length !== 0) {
                    success = true;
                    imgsrc = success ? (METEO_BASE_URL +  imgsrc) : '';
                }
            }
        } catch (e) {
            console.error("Exception during grabPage for '" + alias + "' ==> " + e);
        }
        processCache[alias].updateCache(success, imgsrc);
    });
}

function updateCam(alias) {
    grabPageContentToProcess(PLAYER + alias, function ($) {
        var success = false, imgsrc = null, script, match, address, streamid, plyref;
        try {
            if ($ !== undefined) {
                script = $('script:not([src])').first().html();
                match = REGEXP_SCRIPT.exec(script);

                if (!match) {
                    console.log("script doesn't match pattern for address and streamid");
                } else {
                    address = match[1];
                    streamid = match[2];
                    if (streamid === null || streamid === undefined || streamid.length === 0) {
                        imgsrc = NO_CONNECTION_GIF;
                        plyref = '';
                    } else {
                        success = true;
                        imgsrc  = address + '/streams/' + streamid + '/snapshot.jpg';
                        plyref  = camPlayerRef(alias);
                    }
                }
            }
        } catch (e) {
            console.error("Exception during grab-CAM for '" + alias + "' ==> " + e);
        }
        processCache[alias].updateCache(success, imgsrc, plyref);
    });
}

function AliasCache(alias, plyref, updateFn) {
    var me = this;
    this.alias = alias;
    this.plyref = plyref;
    this.fetchUpdate = function () {
        me.handle = null;
        updateFn();
    };
    
    this.imgsrc = null;
    this.handle = null;
    this.updts = null;
    this.cnt = {success: 0, all: 0};
    
    // register for launch (with spread)
    console.log("1st schedule for %s at %d", alias, launchDelta);
    this.schedule(launchDelta);
    launchDelta += DELTA;
}
AliasCache.prototype.updateCache = function (success, src, plyref) {
    try {
        this.cnt.success += success ? 1 : 0;
        this.cnt.all += 1;
        this.imgsrc = src;
        if (plyref !== undefined) {
            this.plyref = plyref;
        }
        this.updts = Date.now();
        console.log("updated img for '%s' ==>  %s", this.alias, this.imgsrc);
    } catch (e) {
        console.error("Error in update of '" + this.alias + "' ==> " + e);
    }
    this.repeat();
};
AliasCache.prototype.repeat = function () {
    this.schedule(INTERVAL);
};
AliasCache.prototype.schedule = function (at) {
    this.handle = setTimeout(this.fetchUpdate, at);
};
AliasCache.prototype.unschedule = function () {
    if (this.handle !== null) {
        clearTimeout(this.handle);
    }
};
AliasCache.prototype.asDO = function () {
    return {
        "alias"    : this.alias,
        "image"    : this.imgsrc,
        "updatets" : moment(this.updts).format(),
        "player"   : this.plyref,
        "score"    : util.format("%d/%d (%s %%)", this.cnt.success, this.cnt.all,
                                 Math.round(100 * this.cnt.success / this.cnt.all)),
        "handler"  : (this.handler === null ? 'off' : 'on')
    };
};

function initAlias(alias, plyref, updateFn) {
    processCache[alias] = new AliasCache(alias, plyref, updateFn);
}

function stopCacheAndClear() {
    Object.keys(processCache).forEach(function (alias) {
        processCache[alias].unschedule();
    });
    processCache = {};
}

function init() {
    stopCacheAndClear();
    
    console.log("initialising the phantom");
    phantom.create(['--ignore-ssl-errors=yes', '--load-images=no']).then(function (instance) {
        webagent = instance;
        Object.keys(PAGES).forEach(function (alias) {
            initAlias(alias, '', function () { updatePage(alias); });
        });

        CAMS.forEach(function (alias) {
            initAlias(alias, camPlayerRef(alias), function () { updateCam(alias); });
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

router.get('/reinit', function (req, res, next) {
    init();
    res.redirect(req.baseUrl + '/cams.json');
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
