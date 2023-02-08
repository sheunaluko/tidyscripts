(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "tidyscripts_common"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.WebSocketMaker = void 0;
    var common = require("tidyscripts_common");
    var log = common.logger.get_logger({ id: "ws" });
    function WebSocketMaker(ops) {
        var url = ops.url, handler = ops.handler, open = ops.open, error = ops.error, close = ops.close;
        open = open || (function () { log("ws to ".concat(url, " opened")); });
        close = close || (function () { log("ws to ".concat(url, " closed")); });
        error = error || (function (e) { log("ws to ".concat(url, " errored: ").concat(JSON.stringify(e))); });
        var ws = new WebSocket(url);
        ws.onopen = open;
        ws.onclose = close;
        ws.onerror = error;
        ws.onmessage = function (e) { handler(e.data); };
        return ws;
    }
    exports.WebSocketMaker = WebSocketMaker;
});
