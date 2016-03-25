/*jslint node: true*/
/*jslint nomen: true */

"use strict";

var rwcsv = require('./rwcsv'),
    fs = require('fs'),
    util = require('util'),
    path = require('path'),
    argv = require('yargs'),
    async = require('async'),
    moment = require('moment'),
    CHECK_MODS = {
        "imgs":  require('./mediacheck'),
        "dates": require('./filecheck')
    };

function WinDump(base, cfg) {
    this.check = {};
    this.recurse = cfg.recurse || false;
    this.pattern = cfg.pattern || '.*\\.xml$';
    if (cfg.path.charAt(0) === '/' || cfg.path.slice(1, 3) === ':\\') {
        this.path = cfg.path;
    } else {
        this.path = path.join(base, cfg.path);
    }
    if (!fs.existsSync(this.path)) {
        this.error = util.format("*CONFIG* path %s does not exist.", this.path);
        this.path = undefined;
        return;
    }
    if (!fs.statSync(this.path).isDirectory()) {
        this.error = util.format("*CONFIG* path %s is not a directory.", this.path);
        this.path = undefined;
        return;
    }
    this.check.dates = {};
    this.check.imgs  = {};
}

WinDump.prototype.toString = function () {
    return "dump@[" + this.path + "]";
};

WinDump.prototype.start = function (check) {
    var me = this,
        tjk = this.check[check],
        checkMOD = CHECK_MODS[check];
    if (tjk.active) {
        return;
    } //else
    tjk.active = true;
    tjk.started = moment();
    tjk.progress = checkMOD.check(this.path, this.pattern, this.recurse, function (err, results) {
        if (check === "dates") {
            results.byfile = results.byfile.map(function (item) {
                item.file    = item.file.slice(me.path.length);
                item.mtime   = item.mtime   ? moment(item.mtime).fromNow()   : "#N/A";
                item.min_upd = item.min_upd ? moment(item.min_upd).fromNow() : "#N/A";
                item.max_upd = item.max_upd ? moment(item.max_upd).fromNow() : "#N/A";
                return item;
            });
        }
        tjk.ended = moment();
        tjk.error = err;
        tjk.results = results;
        tjk.active = false;
    });
};

WinDump.prototype.stop = function (check) {
    var tjk = this.check[check];
    tjk.progress.job.kill();
    tjk.progress = undefined;
    tjk.active = false;
};



module.exports.create = function (base, cfg) {return new WinDump(base, cfg); };
