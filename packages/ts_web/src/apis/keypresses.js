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
    exports.load_key_handlers = void 0;
    var common = require("tidyscripts_common");
    var log = common.logger.get_logger({ id: "key_presses" });
    var fp = common.fp;
    var debug = common.util.debug;
    function load_key_handlers(keymap) {
        window.onkeypress = function (e) {
            log("Keypress!");
            var key = e.key;
            console.log(key);
            if (keymap[key]) {
                keymap[key]();
            }
        };
    }
    exports.load_key_handlers = load_key_handlers;
});
