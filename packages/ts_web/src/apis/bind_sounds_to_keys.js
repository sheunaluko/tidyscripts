(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "tidyscripts_common", "../util/sounds", "./keypresses"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.load_sound_key_handler = exports.sound_key_handler = exports.keys_to_notes_1 = exports.keys = void 0;
    var common = require("tidyscripts_common");
    var sounds = require("../util/sounds");
    var kp = require("./keypresses");
    var log = common.logger.get_logger({ id: "key_sounds" });
    var fp = common.fp;
    var debug = common.util.debug;
    var hi = ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "["];
    var mid = ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";"];
    var lo = ["z", "x", "c", "v", "b", "n", "m", ","];
    exports.keys = {
        hi: hi,
        mid: mid,
        lo: lo
    };
    function keys_to_notes_1(key_data) {
        var all_ks = lo.concat(mid).concat(hi);
        var octave = 0;
        var notes = {};
        for (var _i = 0, _a = fp.enumerate(all_ks); _i < _a.length; _i++) {
            var x = _a[_i];
            if (x[0] % 7 == 0) {
                octave += 1;
            }
            var note_num = x[0] % 7 + 1;
            var note = fp.format("{}.{}", [note_num, octave]);
            notes[x[1]] = note;
        }
        return notes;
    }
    exports.keys_to_notes_1 = keys_to_notes_1;
    function sound_key_handler(key_map, dur, bk) {
        if (dur === void 0) { dur = 30; }
        if (bk === void 0) { bk = "1.4"; }
        var hs = {};
        var _loop_1 = function () {
            var k = d[0];
            var v = d[1];
            hs[k] = function () {
                log(String(v));
                sounds.play_note(String(v), dur, bk);
            };
        };
        for (var _i = 0, _a = fp.dict_to_list(key_map); _i < _a.length; _i++) {
            var d = _a[_i];
            _loop_1();
        }
        return hs;
    }
    exports.sound_key_handler = sound_key_handler;
    function load_sound_key_handler(dur, bk) {
        if (dur === void 0) { dur = 30; }
        if (bk === void 0) { bk = "1.4"; }
        var km = sound_key_handler(keys_to_notes_1(exports.keys), dur, bk);
        kp.load_key_handlers(km);
        debug.add("km", km);
    }
    exports.load_sound_key_handler = load_sound_key_handler;
});
