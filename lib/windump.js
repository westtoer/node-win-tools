/*jslint node: true*/
/*jslint nomen: true */

"use strict";
function WinDump(cfg) {
    console.log("<init> Dump %j", cfg);
}

module.exports.create = function (cfg) {return new WinDump(cfg); };
