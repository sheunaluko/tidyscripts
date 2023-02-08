(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./fp", "./logger", "ramda", "./trading/index", "./web3/index", "./util/index", "./async"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.asnc = exports.util = exports.web3 = exports.trading = exports.R = exports.logger = exports.fp = void 0;
    var fp = require("./fp");
    exports.fp = fp;
    var logger = require("./logger");
    exports.logger = logger;
    var R = require("ramda");
    exports.R = R;
    var trading = require("./trading/index");
    exports.trading = trading;
    var web3 = require("./web3/index");
    exports.web3 = web3;
    var util = require("./util/index");
    exports.util = util;
    var asnc = require("./async");
    exports.asnc = asnc;
});
