var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./speech_recognition", "./tts", "./audio_processing"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.speak = exports.speak_with_voice = exports.set_default_voice = exports.default_voice = exports.start_recognition_and_detection = exports.stop_recognition_and_detection = exports.start_recognition = exports.stop_recognition = exports.pause_recognition = exports.initialize_recognition = exports.recognition_state = exports.RecognitionState = exports.recognition = void 0;
    var sr = require("./speech_recognition");
    var tts = require("./tts");
    var ap = require("./audio_processing");
    exports.recognition = null;
    var RecognitionState;
    (function (RecognitionState) {
        RecognitionState["NULL"] = "NULL";
        RecognitionState["STOPPED"] = "STOPPED";
        RecognitionState["PAUSED"] = "PAUSED";
        RecognitionState["LISTENING"] = "LISTENING";
        RecognitionState["STOPPING"] = "STOPPING";
    })(RecognitionState = exports.RecognitionState || (exports.RecognitionState = {}));
    exports.recognition_state = RecognitionState.NULL;
    function initialize_recognition(ops) {
        stop_recognition();
        ops = ops || {};
        var old_on_end = ops.onEnd;
        ops.onEnd = function () {
            if (exports.recognition_state == RecognitionState.STOPPING) {
                console.log("Recognition stopped");
                exports.recognition_state = RecognitionState.STOPPED;
            }
            else {
                exports.recognition_state = RecognitionState.PAUSED;
                console.log("Recognition paused");
            }
            old_on_end ? old_on_end() : null;
        };
        exports.recognition = sr.get_recognition_object(ops);
        exports.recognition_state = RecognitionState.PAUSED;
        ap.audio_detector(start_recognition);
        return;
    }
    exports.initialize_recognition = initialize_recognition;
    function pause_recognition() {
        if (exports.recognition) {
            exports.recognition.abort();
            exports.recognition_state = RecognitionState.PAUSED;
        }
    }
    exports.pause_recognition = pause_recognition;
    function stop_recognition() {
        if (exports.recognition) {
            console.log("Stopping recognition");
            exports.recognition_state = RecognitionState.STOPPING;
            exports.recognition.abort();
            exports.recognition = null;
        }
        ap.stop();
    }
    exports.stop_recognition = stop_recognition;
    function start_recognition() {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (exports.recognition_state == RecognitionState.LISTENING) {
                    return [2];
                }
                if (tts.is_speaking()) {
                    console.log("Wont start recognition while tts active");
                }
                if (exports.recognition) {
                    exports.recognition.start();
                }
                else {
                    initialize_recognition();
                    console.log("Recognition initialized without args");
                }
                exports.recognition_state = RecognitionState.LISTENING;
                return [2];
            });
        });
    }
    exports.start_recognition = start_recognition;
    function stop_recognition_and_detection() {
        var ap_thresh = ap.detection_threshold;
        pause_recognition();
        ap.set_detection_threshold(Infinity);
        return ap_thresh;
    }
    exports.stop_recognition_and_detection = stop_recognition_and_detection;
    function start_recognition_and_detection(t) {
        start_recognition();
        ap.set_detection_threshold(t);
    }
    exports.start_recognition_and_detection = start_recognition_and_detection;
    exports.default_voice = null;
    function set_default_voice(v) {
        exports.default_voice = v;
    }
    exports.set_default_voice = set_default_voice;
    function speak_with_voice(text, voiceURI) {
        return __awaiter(this, void 0, void 0, function () {
            var thresh;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!exports.recognition) return [3, 2];
                        thresh = stop_recognition_and_detection();
                        tts.speak({ text: text, voiceURI: voiceURI });
                        return [4, tts.finished_speaking()];
                    case 1:
                        _a.sent();
                        start_recognition_and_detection(thresh);
                        return [3, 4];
                    case 2:
                        tts.speak({ text: text, voiceURI: voiceURI });
                        return [4, tts.finished_speaking()];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4: return [2];
                }
            });
        });
    }
    exports.speak_with_voice = speak_with_voice;
    function speak(text) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                speak_with_voice(text, exports.default_voice);
                return [2];
            });
        });
    }
    exports.speak = speak;
});
