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
    exports.get_logger = exports.unsuppress = exports.suppress = void 0;
    var log = get_logger({ id: "log" });
    var suppress_map = {};
    function suppress(id, reason) {
        suppress_map[id] = true;
        log("Suppressing ".concat(id, ", reason=").concat(reason || "none_given"));
    }
    exports.suppress = suppress;
    function unsuppress(id) {
        suppress_map[id] = false;
        log("Unsuppressing ".concat(id));
    }
    exports.unsuppress = unsuppress;
    function get_logger(ops) {
        var id = ops.id;
        return function (t) {
            if (suppress_map[id]) {
                return;
            }
            ;
            if (t.toString() == '[object Object]') {
                console.log("[".concat(id, "]:: > "));
                console.log(t);
            }
            else {
                console.log("[".concat(id, "]:: ").concat(t));
            }
        };
    }
    exports.get_logger = get_logger;
});
