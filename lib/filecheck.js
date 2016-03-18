/*jslint node: true*/
/*jslint nomen: true */

"use strict";
var path = require('path'),
    fs = require('fs'),
    async = require('async'),
    moment = require('moment'),
    common_check = require('./common_check'),
    XML = common_check.XML,
    listfiles = common_check.FS.listFiles,
    getURI = common_check.NET.getURI,

    PARALLELGETS = 10,
    PARALLELFILES = 10;

function minMoment(min, mt) {
    if (min === undefined || min.isAfter(mt)) {
        return mt;
    } //else
    return min;
}
function maxMoment(max, mt) {
    if (max === undefined || max.isBefore(mt)) {
        return mt;
    }
    return max;
}
function minmaxMoment(mm, mt) {
    var mint = mt._min || mt,
        maxt = mt._max || mt;

    mm._min = minMoment(mm._min, mint);
    mm._max = maxMoment(mm._max, maxt);
    return mm;
}

function checkTimes(files, cb) {
    var res = {}, q, nsd = XML.winns;
    res.byfile = [];
    res.overall = {"mtime": {}, "upd": {}};

    function answer(r) {
        return cb(null, r);
    }

    function doPartial(file, partialAnswer) {
        console.log("[%d] read file %s", q.running(), file);
        fs.stat(file, function (err, fstat) {
            var mtime = moment(fstat.mtime);
            minmaxMoment(res.overall.mtime, mtime);

            XML.loadFile(file, function (error, dom) {
                var updates = XML.getXpathValue(dom, "/w:*/w:*/w:metadata/t:update_date/text()", nsd).split("|"),
                    minmax = updates.reduce(function (mm, upd) {
                        upd = moment(upd);
                        return minmaxMoment(mm, upd);
                    }, {});
                minmaxMoment(res.overall.upd, minmax);
                res.byfile.push({
                    "file": file,
                    "mtime": mtime.toJSON(),
                    "min_upd": minmax._min.toJSON(),
                    "max_upd": minmax._max.toJSON()
                });

                console.log("[%d]  >> done read file %s", q.running(), file);
                return partialAnswer(null, mtime);
            });
        });
    }

    q = async.queue(doPartial, PARALLELFILES);
    q.drain = function () {
        console.log("loaded %d files to get overall: %j", files.length, res.overall);
        return answer(res);
    };
    q.push(files, function (err) {
        if (err) {
            throw new Error(err);
        } // else
    });
    console.log("file queue (%d) started", files.length);
}


module.exports.check = function (dump, rec, onResultFound) {

    function onFilesListed(err, files) {
        console.log("#files == %d", files.length);
        checkTimes(files, onResultFound);
    }

//    listfiles(dump, /-61008\.xml$/, rec, onFilesListed);
    listfiles(dump, /-all\.xml$/, rec, onFilesListed);
//    listfiles(dump, /(mice|reca)-all\.xml$/, rec, onFilesListed);
};
