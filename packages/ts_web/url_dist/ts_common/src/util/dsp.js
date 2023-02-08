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
    exports.power = void 0;
    function power(x) {
        var pow = 0;
        for (var i = 0; i < x.length; i++) {
            pow += window.Math.pow(x[i], 2);
        }
        return pow;
    }
    exports.power = power;
});
