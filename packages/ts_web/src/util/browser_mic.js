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
    exports.disconnect = exports.connect = exports.audio_primitives = void 0;
    exports.audio_primitives = {
        context: null,
        source: null,
        processor: null,
        stream: null,
    };
    var handleSuccess = function (f, event_name) {
        return function (stream) {
            var _a, _b, _c, _d, _e;
            exports.audio_primitives.stream = stream;
            exports.audio_primitives.context = new window.AudioContext();
            exports.audio_primitives.source = (_a = exports.audio_primitives.context) === null || _a === void 0 ? void 0 : _a.createMediaStreamSource(stream);
            exports.audio_primitives.processor = (_b = exports.audio_primitives.context) === null || _b === void 0 ? void 0 : _b.createScriptProcessor(1024, 1, 1);
            (_c = exports.audio_primitives.source) === null || _c === void 0 ? void 0 : _c.connect(exports.audio_primitives.processor);
            (_d = exports.audio_primitives.processor) === null || _d === void 0 ? void 0 : _d.connect((_e = exports.audio_primitives.context) === null || _e === void 0 ? void 0 : _e.destination);
            exports.audio_primitives.processor.onaudioprocess = function (e) {
                var val = f(e.inputBuffer.getChannelData(0));
                var evt = new window.CustomEvent(event_name, {
                    detail: val
                });
                window.dispatchEvent(evt);
            };
        };
    };
    function connect(f, event_name) {
        var name = event_name || 'tidyscripts_web_mic';
        window.navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .then(handleSuccess(f, name));
    }
    exports.connect = connect;
    function disconnect() {
        var ctx = exports.audio_primitives.context;
        if (ctx) {
            ctx.close();
        }
        exports.audio_primitives = {
            context: null,
            source: null,
            processor: null,
            stream: null,
        };
    }
    exports.disconnect = disconnect;
});
