/*
   Implementing speech recognition for the browser (chrome)
   Thu Jul  2 09:05:48 PDT 2020
*/
export function get_recognition_object(ops) {
    if (ops === void 0) { ops = {}; }
    var _a = ops.result_dispatch, result_dispatch = _a === void 0 ? "tidyscripts_web_speech_recognition_result" : _a;
    var _b = ops.continuous, continuous = _b === void 0 ? true : _b, _c = ops.interimResults, interimResults = _c === void 0 ? false : _c, _d = ops.onStart, onStart = _d === void 0 ? function () { console.log("Recognition started"); } : _d, _e = ops.onSoundStart, onSoundStart = _e === void 0 ? function () { console.log("Sound started..."); } : _e, _f = ops.onResult, onResult = _f === void 0 ? function (e) {
        var result = e.results[e.resultIndex][0].transcript;
        console.log("Recognition result: " + result);
        window.dispatchEvent(new CustomEvent(result_dispatch, { detail: result }));
    } : _f, _g = ops.onError, onError = _g === void 0 ? function (e) { console.log("Recognition error: "); console.log(e); } : _g, _h = ops.onEnd, onEnd = _h === void 0 ? function () { console.log("Recognition ended"); } : _h, _j = ops.lang, lang = _j === void 0 ? 'en-US' : _j;
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