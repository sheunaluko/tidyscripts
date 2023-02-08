(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./portfolio_balancer_lib", "./backtester"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.backtest_balancer = exports.portfolio_balancer_lib = void 0;
    var portfolio_balancer_lib = require("./portfolio_balancer_lib");
    exports.portfolio_balancer_lib = portfolio_balancer_lib;
    var backtest_balancer = require("./backtester");
    exports.backtest_balancer = backtest_balancer;
});
