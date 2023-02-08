(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./binance_ws", "./binance_listener"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.binance_listener = exports.binance_ws = void 0;
    var binance_ws = require("./binance_ws");
    exports.binance_ws = binance_ws;
    var binance_listener = require("./binance_listener");
    exports.binance_listener = binance_listener;
});
