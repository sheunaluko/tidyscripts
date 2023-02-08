(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./keypresses", "./bind_sounds_to_keys", "./local_storage"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.bind_sounds_to_keys = exports.local_storage = exports.key_presses = void 0;
    var key_presses = require("./keypresses");
    exports.key_presses = key_presses;
    var bind_sounds_to_keys = require("./bind_sounds_to_keys");
    exports.bind_sounds_to_keys = bind_sounds_to_keys;
    var local_storage = require("./local_storage");
    exports.local_storage = local_storage;
});
