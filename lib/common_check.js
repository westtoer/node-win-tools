/*jslint node: true*/
/*jslint nomen: true */

//TODO -- consider using streaming XML parser
//   https://github.com/robrighter/node-xml

"use strict";
var fs = require('fs'),
    path = require('path'),
    util = require('util'),
    http = require('http'),
    https = require('https'),
    getter = {"http": http, "https": https},
    async = require('async'),
    DOMParser = require('xmldom').DOMParser,
    xpath = require('xpath'),
    moment = require('moment'),

    PARALLELGETS = 10,
    PARALLELFILES = 10;


function getURI(uri, cb) {
    var protocol = uri.slice(0, uri.indexOf("://"));
    getter[protocol].get(uri, cb).on('error', function (err) {
        console.error('*ERROR* get uri %s\n\t> %j', uri, err);
        cb({"statusCode": "60x"});
    });
}

function loadXML(strm, cb) {
    var data = "", error;
    strm.on('data', function (chunk) {data += chunk; })
        .on('error', function (err) {error = true; console.error(err); })
        .on('end', function () {
            var doc, root;
            if (error === undefined) {
                doc = new DOMParser().parseFromString(data, 'text/xml');
                root = doc.documentElement;
            }
            cb(error, root);
        });
}

function loadXMLFile(p, cb) {
    loadXML(fs.createReadStream(p, {encoding: "utf-8"}), cb);
}

function getXpath(elm, xpqry, nsd, mapfn) {
    nsd = nsd || {};
    var select = xpath.useNamespaces(nsd),
        list = select(xpqry, elm);

    if (mapfn) {
        list = list.map(mapfn);
    }
    return list;
}
function getXpathValue(elm, xpqry, nsd, delim) {
    delim = delim || "|";
    return getXpath(elm, xpqry, nsd, function (n) { return n.nodeValue; }).join(delim);
}


function listfiles(pt, pattern, recursive, cb) {
    console.log("listfiles in %s with %s and rec=%s", pt, pattern, recursive);
    var files = [];
    function done() {
        return cb(null, files);
    }
    function list(p, m, fn) {
        fs.readdir(p, function (err, names) {
            if (err) { console.error("ERROR: %s", err); return; }
            files = files.concat(
                names
                    .filter(function (name) { return m.test(name);  })
                    .map(function (name) { return path.join(p, name); })
            );
            var dirs = [];
            names.forEach(function (name) {
                var np = path.join(p, name);
                if (fs.statSync(np).isDirectory()) {
                    dirs.push(np);
                }
            });
            fn(dirs);
        });
    }
    function recurse(p, m, fn) {
        list(p, m, function (dirs) {
            var cnt = dirs.length;
            function proceed() {
                cnt -= 1;
                if (cnt === 0) { fn(); }
            }

            if (cnt === 0) {
                fn();
            } else {
                dirs.forEach(function (dir) {
                    recurse(dir, m, proceed);
                });
            }
        });
    }
    if (recursive) {
        recurse(pt, pattern, done);
    } else {
        list(pt, pattern, done);
    }
}


module.exports = {};

module.exports.NET = {
    "getURI" : getURI
};
module.exports.XML = {
    "load"     : loadXML,
    "loadFile" : loadXMLFile,
    "getXpath" : getXpath,
    "getXpathValue" : getXpathValue,
    "winns"    : {
        "t": "http://www.tobania.be/TDMS",
        "w": "http://www.tobania.be/TDMS/Westtoer"
    }
};
module.exports.FS = {
    "listFiles": listfiles
};
