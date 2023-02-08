(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./browser_mic", "tidyscripts_common"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.stop = exports.audio_detector = exports.set_detection_threshold = exports.detection_threshold = exports.listeners = exports.start_power = void 0;
    var mic = require("./browser_mic");
    var common = require("tidyscripts_common");
    var _a = common.util, dsp = _a.dsp, performance = _a.performance;
    function start_power() { mic.connect(function (buf) { return dsp.power(buf); }, 'tidyscripts_web_mic'); }
    exports.start_power = start_power;
    exports.listeners = [];
    exports.detection_threshold = 1000;
    function set_detection_threshold(t) {
        exports.detection_threshold = t;
    }
    exports.set_detection_threshold = set_detection_threshold;
    function audio_detector(cb, thresh) {
        start_power();
        if (thresh) {
            set_detection_threshold(thresh);
        }
        var last_val = 0;
        var start_time = performance.ms();
        var f = function (e) {
            var power = e.detail;
            if (last_val == 0) {
                last_val = power;
                return;
            }
            var pchange = (100) * (power / last_val);
            var elapsed = performance.ms() - start_time;
            if (elapsed > 600 && pchange > exports.detection_threshold) {
                cb();
            }
            else {
            }
            last_val = power;
        };
        window.addEventListener('tidyscripts_web_mic', f);
        exports.listeners.push(['tidyscripts_web_mic', f]);
    }
    exports.audio_detector = audio_detector;
    function stop() {
        mic.disconnect();
        for (var _i = 0, listeners_1 = exports.listeners; _i < listeners_1.length; _i++) {
            var l = listeners_1[_i];
            window.removeEventListener(l[0], l[1]);
        }
        exports.listeners = [];
    }
    exports.stop = stop;
});
