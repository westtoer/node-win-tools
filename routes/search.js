/*jslint node: true */
/*jslint nomen: true */
"use strict";

var express = require('express'),
    pdf = require('html-pdf'),
    wapi = require('node-winapi'),
    winconf = require('../config/win-client.json'),
    win = wapi.client(winconf),
    util = require('util'),
    router = express.Router(),

    ANY_FORM = {"label": "Zoekterm", "name": "q",   "action": "/search/any",     "placeholder": "term"       },
    ID_FORM =  {"label": "WIN2 id",  "name": "id",  "action": "/search/id",      "placeholder": "id"         },
    TDB_FORM = {"label": "TDB id",   "name": "id",  "action": "/search/tdb",     "placeholder": "id"         },
    ADR_FORM = {"label": "Adres",    "name": "adr", "action": "/search/address", "placeholder": "straat..."  },


    PDF_OPTS = {
        "format": 'A4',
        "border": {
            "top"   : "30mm",
            "right" : "30mm",
            "bottom": "30mm",
            "left"  : "30mm"
        }
    };

win.start();

/* GET search page. */
router.get('/', function (req, res, next) {
    res.render('search', {
        "title": 'win-tools::search',
        "menu" : 'search',
        "win"  : win,
        "forms": [
            ANY_FORM,
            ID_FORM//,
        //    TDB_FORM,
        //    ADR_FORM
        ]
    });
});


router.get('/restart', function (req, res, next) {
    win.stop();
    win.start(function (e) {
        res.redirect('/search');
    });
});

function searchResult(res, api, qry, form, params) {
    qry.size(params.size).page(params.page);

    api.fetch(qry, function (e, resp, meta) {
        res.render('search-result', {
            "title"  : 'win-tools::search',
            "menu"   : 'search',
            "form"   : form,
            "params" : params,
            "win"    : win,
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
    return wapi.query(type).asJSON_HAL();
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

router.get('/id', function (req, res, next) {
    res.redirect('detail/' + req.query.id);
});

router.get('/any', function (req, res, next) {
    var params = formParams(req, "q"),
        qry = winquery().match(params.value);

    searchResult(res, win, qry, ANY_FORM, params);
});

router.param('winid', function (req, res, next, winid) {
    var qry = winquery().id(winid);
    win.fetch(qry, function (e, resp, meta) {
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

router.get('/detail/:winid.pdf', function (req, res, next) {
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

router.get('/detail/:winid', function (req, res, next) {
    console.log("got here with %s", res.product._tobus.id);
    res.render('product', {product: res.product, url: req.originalUrl});
});

module.exports = router;
