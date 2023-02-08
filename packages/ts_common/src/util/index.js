(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./dsp", "./performance", "./debug"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.is_node = exports.is_browser = exports.performance = exports.debug = exports.dsp = void 0;
    var dsp = require("./dsp");
    exports.dsp = dsp;
    var performance = require("./performance");
    exports.performance = performance;
    var debug = require("./debug");
    exports.debug = debug;
    function is_browser() {
        return (typeof window !== "undefined" && typeof window.document !== "undefined");
    }
    exports.is_browser = is_browser;
    function is_node() {
        return (typeof process !== "undefined" && process.versions != null && process.versions.node != null);
    }
    exports.is_node = is_node;
});
