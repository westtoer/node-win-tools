/*jslint node: true */
/*jslint nomen: true */
"use strict";

var express = require('express'),
    pdf = require('html-pdf'),
    wapi = require('node-winapi'),
    util = require('util'),
    router = express.Router(),

    ANY_FORM = {"label": "Zoekterm", "name": "q",   "action": "any",     "placeholder": "term"       },
    ID_FORM =  {"label": "WIN2 id",  "name": "id",  "action": "id",      "placeholder": "id"         },
    TDB_FORM = {"label": "TDB id",   "name": "id",  "action": "tdb",     "placeholder": "id"         },
    ADR_FORM = {"label": "Adres",    "name": "adr", "action": "address", "placeholder": "straat..."  },

    PRODUCTS = ['accommodation', 'permanent_offering', 'reca', 'temporary_offering', 'mice'],

    PDF_OPTS = {
        "format": 'A4',
        "border": {
            "top"   : "30mm",
            "right" : "30mm",
            "bottom": "30mm",
            "left"  : "30mm"
        }
    };

function getWinapis(req, name) {
    var apis = req.app.locals.options.winapis;
    if (name === undefined || !(apis.hasOwnProperty(name))) {
        return apis;
    } //else
    return apis[name];
}

function getDefaultWinapi(req) {
    return getWinapis(req)._default;
}

function getWin(req, name) {
    var winconf = getWinapis(req, name),
        win;

    if (winconf._win === undefined) {
        winconf._win = wapi.client(winconf);
        winconf._win._name = name;
    }
    win = winconf._win;
    return win;
}

/* GET search page. */
router.get('/', function (req, res, next) {
    res.redirect(req.baseUrl + '/' + getDefaultWinapi(req));
});

router.get('/:winapi', function (req, res, next) {
    res.render('search', {
        "title": 'win-tools::search',
        "menu" : 'search',
        "mount": req.baseUrl,
        "win"  : res.win,
        "winapis": req.app.locals.options.winapis,
        "forms": [
            ANY_FORM,
            ID_FORM//,
        //    TDB_FORM,
        //    ADR_FORM
        ]
    });
});


router.get('/:winapi/restart', function (req, res, next) {
    var win = res.win;
    win.stop();
    win.start(function (e) {
        res.redirect(req.baseUrl + '/' + res.win._name);
    });
});

function searchResult(res, mount, qry, form, params) {
    var api = res.win;
    qry.size(params.size).page(params.page);

    console.log("*mount = %s", mount);

    api.fetch(qry, function (e, resp, meta) {
        res.render('search-result', {
            "title"  : 'win-tools::search',
            "menu"   : 'search',
            "mount"  : mount,
            "win"    : api,
            "form"   : form,
            "params" : params,
            "result" : resp,
            "meta"   : meta,
            "error"  : e,
            "query"  : qry.getURI(api, true),
            "router" : {
                pageURI: function (page) {
                    page = page || params.page;
                    return util.format("?_page=%s&size=%s&%s=%s", page, params.size, form.name, params.value);
                }
            }
        });
    });
}

function winquery(type) {
    type = type || 'product';
    return wapi.query(type).forTypes(PRODUCTS).asJSON_HAL();
}

function formVal(req, valueName, defVal) {
    var val = req.query[valueName];
    if (val === undefined || val === null || String(val).length === 0) {
        return defVal;
    } else {
        return val;
    }
}

function formParams(req, valueName) {
    var size = formVal(req, "_size", 10),
        page = formVal(req, "_page", 1);
    return { value: req.query[valueName], size: size, page: page};
}

router.get('/:winapi/id', function (req, res, next) {
    //res.redirect('detail/' + req.query.id);
    var params = formParams(req, "id"),
        qry = winquery().id(params.value);

    searchResult(res, req.baseUrl, qry, ID_FORM, params);
});

router.get('/:winapi/any', function (req, res, next) {
    var params = formParams(req, "q"),
        qry = winquery().match(params.value);

    searchResult(res, req.baseUrl, qry, ANY_FORM, params);
});

router.param('winapi', function (req, res, next, winapi) {
    res.win = getWin(req, winapi);
    next();
});

router.param('winid', function (req, res, next, winid) {
    var qry = winquery().id(winid);
    res.win.fetch(qry, function (e, resp, meta) {
        if (e) {
            throw new Error("Error fetching id == " + winid + ":\n" + e);
        }
        if (resp === undefined || resp === null || !resp.length) {
            throw new Error("no result found for id == " + winid);
        }

        res.product = resp[0];
        next();
    });
});

router.get('/:winapi/detail/:winid.pdf', function (req, res, next) {
    res.render('product', {product: res.product, style: 'pdf'}, function (err, html) {
        //TODO apply proper error handling

        // using https://www.npmjs.com/package/html-pdf
        pdf.create(html, PDF_OPTS).toStream(function (error, stream) {
            //TODO apply proper error handling
            //also apply stuff like this
            res.setHeader('Content-disposition', 'attachment; filename="win-' + res.product._tobus.id + '.pdf"'); //TODO add date?
            res.setHeader('Content-type', 'application/pdf');
            stream.pipe(res);
        });
    });
});

router.get('/:winapi/detail/:winid', function (req, res, next) {
    console.log("got here with %s", res.product._tobus.id);
    res.render('product', {product: res.product, url: req.originalUrl});
});

module.exports = router;
