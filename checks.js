/*jslint node: true */
/*jslint es5: true */
/*jslint nomen: true */
/*global setImmediate */

"use strict";

var rwcsv = require('./lib/rwcsv'),
    fs = require('fs'),
    path = require('path'),
    argv = require('yargs'),
    async = require('async'),
    moment = require('moment'),
    mc = require('./lib/mediacheck'),
    fc = require('./lib/filecheck'),
    settings,

    CMD_IMGS = "imgs",
    CMD_FILES = "files";

settings = argv
    .usage('Checkt de opgelijste beelden in de verschillende xml files in de aangegeven windump-directory')
    .example('$0  -o ./imgs-check.csv',
             'Maakt de winid,status,media-uri dump in csvi formaat.')

    .describe('output', 'folder waar de dump wordt geplaatst.')
    .alias('o', 'output')
    .default('o', path.join(__dirname, 'imgs-check.csv'))

    .describe('input', 'folder waar de xml bestanden gelezen worden.')
    .alias('i', 'input')
    .default('i', path.join(__dirname, '_link-data/LOCAL/'))

    .describe('recurse', 'folder waar de xml bestanden gelezen worden.')
    .alias('r', 'recurse')
    .default('r', false)

    .describe('pattern', 'regex patroon waaraan de filenames moeten voldoen.')
    .alias('p', 'pattern')
    .default('p', '.*-all\\.xml$')

    .require(1)

    .argv;

function assertDirExists(dir) {
    if (!fs.existsSync(dir)) { fs.mkdirSync(dir); }
}

function outputDir(s) {
    var dir = path.join(s.input, "checks");
    assertDirExists(dir);
    return dir;
}

function fileCheck(s) {
    var outd = outputDir(s);
    fc.check(s.input, s.pattern, s.recurse, function (err, results) {
        rwcsv.write(path.join(outd, "file_updates.csv"), results.byfile,
                 ["file", "mtime", "min_upd", "max_upd"]);
    });
}

function writeCSV(outf, dbag, headers) {
    var data = [];
    Object.keys(dbag).forEach(function (k) {
        data.push(dbag[k]);
    });

    rwcsv.write(outf, data, headers);
}

function imgCheck(s) {
    var outd = outputDir(s);
    mc.check(s.input, s.pattern, s.recurse, function (err, results) {
        writeCSV(path.join(outd, "bad_images.csv"),   results.badimgs,
                 ["winid", "deleted", "published", "imguri", "broken"]);
        writeCSV(path.join(outd, "no_images.csv"),    results.noimgs,
                 ["winid", "deleted", "published", "imguri"]);
        writeCSV(path.join(outd, "error_images.csv"), results.errurls,
                 ["winid", "deleted", "published", "imguri", "status"]);
        writeCSV(path.join(outd, "multi_use.csv"),    results.multi_use,
                 ["winid", "deleted", "published", "imguri"]);
    });
}


if (settings._.indexOf(CMD_IMGS) !== -1) {
    imgCheck(settings);
}

if (settings._.indexOf(CMD_FILES) !== -1) {
    fileCheck(settings);
}


