(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "ethers", "@uniswap/sdk", "./evm_balancers", "./abis/index", "./info", "./utils", "./smart_wallet", "./accounts/index", "./chain_id"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.chain_id = exports.accounts = exports.smart_wallet = exports.utils = exports.abis = exports.evm_balancers = exports.info = exports.uniswap_sdk = exports.ethers = void 0;
    var ethers_1 = require("ethers");
    Object.defineProperty(exports, "ethers", { enumerable: true, get: function () { return ethers_1.ethers; } });
    var uniswap_sdk = require("@uniswap/sdk");
    exports.uniswap_sdk = uniswap_sdk;
    var evm_balancers = require("./evm_balancers");
    exports.evm_balancers = evm_balancers;
    var abis = require("./abis/index");
    exports.abis = abis;
    var info = require("./info");
    exports.info = info;
    var utils = require("./utils");
    exports.utils = utils;
    var smart_wallet = require("./smart_wallet");
    exports.smart_wallet = smart_wallet;
    var accounts = require("./accounts/index");
    exports.accounts = accounts;
    var chain_id = require("./chain_id");
    exports.chain_id = chain_id;
});
