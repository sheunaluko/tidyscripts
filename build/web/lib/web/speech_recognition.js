/*
   Implementing speech recognition for the browser (chrome)
   Thu Jul  2 09:05:48 PDT 2020
*/
export function get_recognition_object(ops) {
    if (ops === void 0) { ops = {}; }
    var _a = ops.continuous, continuous = _a === void 0 ? true : _a, _b = ops.interimResults, interimResults = _b === void 0 ? false : _b, _c = ops.onStart, onStart = _c === void 0 ? function () { console.log("Recognition started"); } : _c, _d = ops.onSoundStart, onSoundStart = _d === void 0 ? function () { console.log("Sound started..."); } : _d, _e = ops.onResult, onResult = _e === void 0 ? function (e) { console.log("Recognition result: " + e.results[e.resultIndex][0].transcript); } : _e, _f = ops.onError, onError = _f === void 0 ? function (e) { console.log("Recognition error: "); console.log(e); } : _f, _g = ops.onEnd, onEnd = _g === void 0 ? function () { console.log("Recognition ended"); } : _g, _h = ops.lang, lang = _h === void 0 ? 'en-US' : _h;
    var rec = new window.webkitSpeechRecognition();
    rec.onsoundstart = onStart;
    rec.onresult = onResult;
    rec.onerror = onError;
    rec.onend = onEnd;
    rec.continuous = continuous;
    rec.interimResults = interimResults;
    rec.onstart = onStart;
    rec.onsoundstart = onSoundStart;
    return rec;
}
//# sourceMappingURL=speech_recognition.js.map