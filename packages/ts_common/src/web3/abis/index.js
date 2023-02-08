(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./erc20", "./uniswap_v2_router_abi", "./uniswap_v2_pool_abi"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.erc20 = exports.uni_v2 = void 0;
    var erc20_1 = require("./erc20");
    exports.erc20 = erc20_1.default;
    var uniswap_v2_router_abi_1 = require("./uniswap_v2_router_abi");
    var uniswap_v2_pool_abi_1 = require("./uniswap_v2_pool_abi");
    exports.uni_v2 = {
        router: uniswap_v2_router_abi_1.default,
        pool: uniswap_v2_pool_abi_1.default,
    };
});
