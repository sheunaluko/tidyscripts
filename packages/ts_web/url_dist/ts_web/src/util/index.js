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
        define(["require", "exports", "tidyscripts_common", "./tts", "./speech_recognition", "./sounds", "./audio_processing", "./voice_interface", "./ws"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.hello = exports.define = exports.uuid = exports.is_mobile = exports.is_chrome = exports.alert = exports.audio_processing = exports.voice_interface = exports.sounds = exports.speech_recognition = exports.ws = exports.tts = void 0;
    var common = require("tidyscripts_common");
    var tts = require("./tts");
    exports.tts = tts;
    var speech_recognition = require("./speech_recognition");
    exports.speech_recognition = speech_recognition;
    var sounds = require("./sounds");
    exports.sounds = sounds;
    var audio_processing = require("./audio_processing");
    exports.audio_processing = audio_processing;
    var voice_interface = require("./voice_interface");
    exports.voice_interface = voice_interface;
    var ws = require("./ws");
    exports.ws = ws;
    var log = common.logger.get_logger({ id: "wutil" });
    function alert(s) {
        log("Alerting web page!");
        window.alert(s);
    }
    exports.alert = alert;
    function is_chrome() {
        return /Chrome/.test(window.navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    }
    exports.is_chrome = is_chrome;
    function is_mobile() {
        return /Mobi/.test(window.navigator.userAgent);
    }
    exports.is_mobile = is_mobile;
    function uuid() {
        var buf = new Uint32Array(4);
        window.crypto.getRandomValues(buf);
        var idx = -1;
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            idx++;
            var r = (buf[idx >> 3] >> ((idx % 8) * 4)) & 15;
            var v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    exports.uuid = uuid;
    ;
    function define(promise, id) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = window;
                        _b = id;
                        return [4, promise];
                    case 1:
                        _a[_b] = _c.sent();
                        log("Defined ".concat(id, " on the window object :)"));
                        return [2];
                }
            });
        });
    }
    exports.define = define;
    function hello() {
        console.log("hiiii!");
    }
    exports.hello = hello;
});
