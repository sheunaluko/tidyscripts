(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./util/index", "./cryptocurrency/index", "./apis/index", "./components/index", "tidyscripts_common"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.common = exports.cryptocurrency = exports.apis = exports.components = exports.util = void 0;
    var util = require("./util/index");
    exports.util = util;
    var cryptocurrency = require("./cryptocurrency/index");
    exports.cryptocurrency = cryptocurrency;
    var apis = require("./apis/index");
    exports.apis = apis;
    var components = require("./components/index");
    exports.components = components;
    var common = require("tidyscripts_common");
    exports.common = common;
});
