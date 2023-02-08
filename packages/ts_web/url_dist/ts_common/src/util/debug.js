(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "../logger"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.log = exports.get = exports.add = exports.db = void 0;
    var logger_1 = require("../logger");
    exports.db = {};
    function add(id, val) {
        exports.db[id] = val;
    }
    exports.add = add;
    function get(id) {
        return exports.db[id];
    }
    exports.get = get;
    exports.log = (0, logger_1.get_logger)({ id: "debug" });
});
