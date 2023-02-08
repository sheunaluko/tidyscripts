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
    exports.get_t = exports.store_t = exports.get_header = exports.get_keys = exports.get = exports.store = exports.full_name = exports.dot_join = exports.set_storage_header = void 0;
    var common = require("tidyscripts_common");
    var fp = common.fp;
    var LS = function () {
        return window.localStorage;
    };
    var storage_header = "tidyscripts";
    function set_storage_header(h) { storage_header = h; }
    exports.set_storage_header = set_storage_header;
    function dot_join(a) { return a.join("."); }
    exports.dot_join = dot_join;
    function full_name(n) { return dot_join([storage_header, n]); }
    exports.full_name = full_name;
    function store(o, n) { LS()[full_name(n)] = JSON.stringify(o); }
    exports.store = store;
    function get(n) {
        var data = LS()[full_name(n)];
        if (data) {
            return JSON.parse(data);
        }
        else {
            return null;
        }
    }
    exports.get = get;
    function get_keys() { return Object.keys(LS()); }
    exports.get_keys = get_keys;
    function get_header(h) {
        var obs = get_keys();
        return fp.filter(obs, function (s) { return s.startsWith(h); });
    }
    exports.get_header = get_header;
    function store_t(o, n) {
        var msg = {
            timestamp: Number(new Date()),
            data: o
        };
        store(msg, n);
    }
    exports.store_t = store_t;
    function get_t(n) {
        return get(n);
    }
    exports.get_t = get_t;
});
