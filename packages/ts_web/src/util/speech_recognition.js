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
    exports.get_recognition_object = void 0;
    function get_recognition_object(ops) {
        if (ops === void 0) { ops = {}; }
        var _a = ops.result_dispatch, result_dispatch = _a === void 0 ? "tidyscripts_web_speech_recognition_result" : _a;
        var _b = ops.continuous, continuous = _b === void 0 ? true : _b, _c = ops.interimResults, interimResults = _c === void 0 ? false : _c, _d = ops.onStart, onStart = _d === void 0 ? function () { console.log("Recognition started"); } : _d, _e = ops.onSoundStart, onSoundStart = _e === void 0 ? function () { console.log("Sound started..."); } : _e, _f = ops.onSoundEnd, onSoundEnd = _f === void 0 ? function () { console.log("Sound ended..."); } : _f, _g = ops.onSpeechStart, onSpeechStart = _g === void 0 ? function () { console.log("Speech started..."); } : _g, _h = ops.onSpeechEnd, onSpeechEnd = _h === void 0 ? function () { console.log("Speech ended..."); } : _h, _j = ops.onResult, onResult = _j === void 0 ? function (e) {
            var result = e.results[e.resultIndex][0].transcript;
            console.log("Recognition result: " + result);
            window.dispatchEvent(new CustomEvent(result_dispatch, { detail: result }));
        } : _j, _k = ops.onError, onError = _k === void 0 ? function (e) { console.log("Recognition error: "); console.log(e); } : _k, _l = ops.onEnd, onEnd = _l === void 0 ? function () { console.log("Recognition ended"); } : _l, _m = ops.lang, lang = _m === void 0 ? 'en-US' : _m;
        var rec = new window.webkitSpeechRecognition();
        rec.onresult = onResult;
        rec.onerror = onError;
        rec.onend = onEnd;
        rec.continuous = continuous;
        rec.interimResults = interimResults;
        rec.onstart = onStart;
        rec.onsoundstart = onSoundStart;
        rec.onsoundend = onSoundEnd;
        rec.onspeechstart = onSpeechStart;
        rec.onspeechend = onSpeechEnd;
        return rec;
    }
    exports.get_recognition_object = get_recognition_object;
});
