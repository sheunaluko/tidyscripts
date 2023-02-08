(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "../util/ws", "tidyscripts_common"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.basic_spot_trade_socket = exports.spot_trade_socket = exports.basic_spot_kine_socket = exports.spot_kline_socket = void 0;
    var ws_1 = require("../util/ws");
    var common = require("tidyscripts_common");
    var log = common.logger.get_logger({ id: "bws" });
    function spot_kline_socket(ops, interval) {
        var sym = ops.sym, handler = ops.handler, error = ops.error, close = ops.close, open = ops.open;
        sym = sym.toLowerCase();
        interval = interval || "1m";
        var url = "wss://stream.binance.com:9443/ws/".concat(sym, "@kline_").concat(interval);
        log("Using url for spot kline socket: " + url);
        return (0, ws_1.WebSocketMaker)({ url: url, handler: handler, error: error, close: close, open: open });
    }
    exports.spot_kline_socket = spot_kline_socket;
    function basic_spot_kine_socket(sym, handler) {
        handler = handler || (function (e) { console.log(JSON.parse(e)); });
        return spot_kline_socket({ sym: sym, handler: handler });
    }
    exports.basic_spot_kine_socket = basic_spot_kine_socket;
    function spot_trade_socket(ops) {
        var sym = ops.sym, handler = ops.handler, error = ops.error, close = ops.close, open = ops.open;
        sym = sym.toLowerCase();
        var url = "wss://stream.binance.com:9443/ws/".concat(sym, "@aggTrade");
        log("Using url for spot trade socket: " + url);
        return (0, ws_1.WebSocketMaker)({ url: url, handler: handler, error: error, close: close, open: open });
    }
    exports.spot_trade_socket = spot_trade_socket;
    function basic_spot_trade_socket(sym, handler) {
        handler = handler || (function (e) { console.log(JSON.parse(e)); });
        return spot_trade_socket({ sym: sym, handler: handler });
    }
    exports.basic_spot_trade_socket = basic_spot_trade_socket;
});
