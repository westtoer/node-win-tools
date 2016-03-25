/*jslint node: true*/
/*jslint nomen: true */

"use strict";
var path = require('path'),
    fs = require('fs'),
    async = require('async'),
    common_check = require('./common_check'),
    XML = common_check.XML,
    listfiles = common_check.FS.listFiles,
    getURI = common_check.NET.getURI,

    refbroken = path.join(__dirname, 'ref/broken-media.jpg'),
    brokenbuf = [],
    BROKEN,

    NOIMGS = "#N/A",
    PARALLELGETS = 10,
    PARALLELFILES = 10;

fs.createReadStream(refbroken)
    .on('data', function (chunk) {
        brokenbuf.push(chunk);
    })
    .on('end',  function () {
        BROKEN = Buffer.concat(brokenbuf);
    });


function testimguris(imgs, cb) {
    console.log("working on %d imgs", imgs.length);

    var res = {}, work = {}, workkeys, q;
    res.noimgs = {};
    res.badimgs = {};
    res.errurls = {};
    res.multi_use = {};

    function answer(r) {
        cb(null, r);
    }

    imgs.forEach(function (img) {
        if (img.imguri === NOIMGS) {
            if (!res.noimgs.hasOwnProperty(img.winid)) {
                res.noimgs[img.winid] = img;
            }
        } else {
            if (!work.hasOwnProperty(img.imguri)) {
                work[img.imguri] = {};
            }
            if (!work[img.imguri].hasOwnProperty(img.winid)) {
                work[img.imguri][img.winid] = img;
            }
        }
    });

    workkeys = Object.keys(work);

    function doPartial(uri, partialAnswer) {
        var winidmap = work[uri],
            winidlist = Object.keys(winidmap);

        if (winidmap.length > 1) {
            res.multi_use[uri] = {
                "winid": winidlist.join("|"),
                "deleted": winidlist.map(function (winid) {String(winidmap[winid].deleted); }).join(""),
                "imguri": uri
            };
        }

        getURI(uri, function (resp) {
            if (resp.statusCode !== 200) {
                Object.keys(work[uri]).forEach(function (winid) {
                    var i = work[uri][winid];
                    i.status = resp.statusCode;
                    res.errurls[i.winid] = i;
                });
                return partialAnswer(null, false);
            } // else
            var bufs = [];
            resp.on('data', function (d) { bufs.push(d); });
            resp.on('end', function () {
                var buf = Buffer.concat(bufs);
                if (buf.length === BROKEN.length && BROKEN.compare(buf) === 0) {
                    Object.keys(work[uri]).forEach(function (winid) {
                        var i = work[uri][winid];
                        i.broken = true;
                        res.badimgs[i.winid] = i;
                    });
                }
                return partialAnswer(null, true);
            });
        });
    }

    q = async.queue(doPartial, PARALLELGETS);
    q.drain = function () {
        console.log("loaded %d imgs", workkeys.length);
        return answer(res);
    };
    q.push(workkeys, function (err) {
        if (err) {
            throw new Error(err);
        } // else
    });
    console.log("img test queue (%d) started", workkeys.length);
    return q;
}

function listimguris(files, cb) {
    console.log("working in %d files", files.length);
    var imgset = [], q, nsd = XML.winns;
    function answer(imgs) {
        cb(null, imgs);
    }

    function doPartial(file, partialAnswer) {
        console.log("[%d] read file %s", q.running(), file);
        XML.loadFile(file, function (error, dom) {
            var count = 0,
                items = XML.getXpath(dom, "/w:*/w:*", nsd);

            items.forEach(function (item) {
                var winid = XML.getXpathValue(item, "w:metadata/t:id/text()", nsd),
                    delet = Boolean(XML.getXpathValue(item, "w:metadata/t:deleted/text()", nsd) !== 'false'),
                    publi = Boolean(XML.getXpathValue(item, "w:publishing_channels/t:published/text()", nsd) !== 'false'),
                    imguris = XML.getXpath(item, "w:media/t:file/t:url", nsd);

                count += imguris.length;
                if (imguris.length === 0) {
                    imgset.push({"winid": winid, "deleted": delet, "published": publi, "imguri": NOIMGS});
                } else {
                    imguris.forEach(function (img) {
                        var imguri = XML.getXpathValue(img, "./text()");
                        imgset.push({"winid": winid, "deleted": delet, "published": publi, "imguri": imguri});
                    });
                }
            });
            if (error) {
                throw new Error(error);
            }
            console.log("[%d]  >> done read file %s", q.running(), file);
            return partialAnswer(null, count);
        });
    }

    q = async.queue(doPartial, PARALLELFILES);
    q.drain = function () {
        console.log("loaded %d files to get %d imguris", files.length, imgset.length);
        return answer(imgset);
    };
    q.push(files, function (err) {
        if (err) {
            throw new Error(err);
        } // else
    });
    console.log("file queue (%d) started", files.length);
    return q;
}

module.exports.check = function (dump, pattern, rec, onResultFound) {
    var progress = {"steps": 3};

    function onImgsListed(err, imgs) {
        console.log("#imgs == %d", imgs.length);
        progress.busy = "checking up on " + imgs.length + " images.";
        progress.step = 3;
        progress.stepsize = imgs.length;
        progress.job = testimguris(imgs, onResultFound);
    }

    function onFilesListed(err, files) {
        console.log("#files == %d", files.length);
        progress.busy = "finding images in " + files.length + " files.";
        progress.step = 2;
        progress.stepsize = files.length;
        progress.job = listimguris(files, onImgsListed);
    }

    progress.busy = "listing files (recursive = " + rec + ") to process.";
    progress.step = 1;
    progress.stepsize = 1;
    listfiles(dump, new RegExp(pattern), rec, onFilesListed);

    return progress;
};
