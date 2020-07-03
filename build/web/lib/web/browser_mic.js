/*
   Wrapper around grabbing the mic input and exposing the buffer callback
   mic.connect(cb)
   mic.disconnect()
   Sun Mar  3 11:36:55 PST 2019 => Fri Jul  3 10:08:07 PDT 2020 (upgrade to TS)
*/
export var audio_primitives = {
    context: null,
    source: null,
    processor: null,
    stream: null,
};
var handleSuccess = function (f, event_name) {
    return function (stream) {
        var _a, _b, _c, _d, _e;
        audio_primitives.stream = stream;
        audio_primitives.context = new window.AudioContext();
        audio_primitives.source = (_a = audio_primitives.context) === null || _a === void 0 ? void 0 : _a.createMediaStreamSource(stream);
        audio_primitives.processor = (_b = audio_primitives.context) === null || _b === void 0 ? void 0 : _b.createScriptProcessor(1024, 1, 1);
        (_c = audio_primitives.source) === null || _c === void 0 ? void 0 : _c.connect(audio_primitives.processor);
        (_d = audio_primitives.processor) === null || _d === void 0 ? void 0 : _d.connect((_e = audio_primitives.context) === null || _e === void 0 ? void 0 : _e.destination);
        audio_primitives.processor.onaudioprocess = function (e) {
            var val = f(e.inputBuffer.getChannelData(0));
            var evt = new window.CustomEvent(event_name, {
                detail: val
            });
            window.dispatchEvent(evt);
        };
    };
};
export function connect(f, event_name) {
    var name = event_name || 'tidyscripts_web_mic';
    window.navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(handleSuccess(f, name));
}
export function disconnect() {
    var ctx = audio_primitives.context;
    if (ctx) {
        ctx.close();
    }
    audio_primitives = {
        context: null,
        source: null,
        processor: null,
        stream: null,
    };
}
//# sourceMappingURL=browser_mic.js.map