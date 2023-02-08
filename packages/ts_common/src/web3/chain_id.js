(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.data = exports.get_id = exports.symbol_to_id = void 0;
    var data = [{ "id": "1", "symbol": "ETH" }, { "id": "56", "symbol": "BNB" }, { "id": "43114", "symbol": "AVAX" }, { "id": "137", "symbol": "MATIC" }, { "id": "42161", "symbol": "ARB_ETH" }, { "id": "10", "symbol": "OPT_ETH" }, { "id": "25", "symbol": "CRO" }, { "id": "250", "symbol": "FTM" }, { "id": "8217", "symbol": "KLAY" }, { "id": "2222", "symbol": "KAVA" }, { "id": "100", "symbol": "xDAI" }, { "id": "7700", "symbol": "CANTO" }, { "id": "32659", "symbol": "FSN" }, { "id": "128", "symbol": "HT" }];
    exports.data = data;
    exports.symbol_to_id = Object.fromEntries(data.map(function (x) { return [x['symbol'], Number(x['id'])]; }));
    function get_id(symbol) {
        return exports.symbol_to_id[symbol];
    }
    exports.get_id = get_id;
});
