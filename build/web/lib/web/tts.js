/*
 Typescript browser tts
 Fri Jul  3 02:13:20 PDT 2020
 */
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
import * as asnc from "../common/util/async";
import * as fp from "../common/util/fp";
export var tts = window.speechSynthesis;
export var speech_que = [];
export function finished_utterance() {
    return __awaiter(this, void 0, void 0, function () {
        var timeout;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, asnc.wait_until(function () {
                        return (!tts.speaking);
                    }, Infinity, 200)];
                case 1:
                    timeout = _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
export function finished_speaking() {
    return __awaiter(this, void 0, void 0, function () {
        var timeout;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, asnc.wait_until(function () {
                        return (!tts.speaking && speech_que.length < 1);
                    }, Infinity, 200)];
                case 1:
                    timeout = _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
export function is_speaking() {
    return (tts.speaking || (speech_que.length > 0));
}
export function _speak(ops) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, voice, _b, rate, text, utterance, _, next;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _a = ops.voice, voice = _a === void 0 ? 49 : _a, _b = ops.rate, rate = _b === void 0 ? 1 : _b, text = ops.text;
                    if (!!tts.speaking) return [3 /*break*/, 2];
                    utterance = new window.SpeechSynthesisUtterance(text);
                    utterance.voice = tts.getVoices()[voice];
                    //utterance.pitch = pitch.value;
                    utterance.rate = rate;
                    tts.speak(utterance);
                    return [4 /*yield*/, finished_utterance()];
                case 1:
                    _ = _c.sent();
                    next = speech_que.shift();
                    if (next) {
                        //modify ops 
                        _speak(next);
                    }
                    else {
                        //pass
                        console.log("done with speech que");
                    }
                    return [3 /*break*/, 3];
                case 2:
                    console.log("Scheduling speech for later.");
                    speech_que.push(ops);
                    _c.label = 3;
                case 3: return [2 /*return*/];
            }
        });
    });
}
export function speak(ops) {
    var _a = ops.voice, voice = _a === void 0 ? 49 : _a, _b = ops.rate, rate = _b === void 0 ? 1 : _b, text = ops.text;
    console.log("Request to speak  =:> " + text);
    /*chunk up the text by word length */
    var chunks = fp.map(fp.partition(fp.split(text, " "), 20), fp.joiner(" "));
    /* and pass them to the speak function */
    chunks.forEach(function (c) {
        var new_ops = fp.clone(ops);
        new_ops.text = c;
        _speak(new_ops);
    });
}
//# sourceMappingURL=tts.js.map