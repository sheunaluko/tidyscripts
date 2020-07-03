/*
 Typscript sound synthesis module for web
 Fri Jul  3 03:03:50 PDT 2020
 Sheun Aluko
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
import * as fp from "../common/util/fp";
import * as asnc from "../common/util/async";
import { m2f } from "./midi2freq";
export { m2f };
var audio_context = window.AudioContext || window.webkitAudioContext;
export var context = new audio_context();
export function tone(ops) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, type, _b, duration, freq, osc;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _a = ops.type, type = _a === void 0 ? "sine" : _a, _b = ops.duration, duration = _b === void 0 ? 600 : _b, freq = ops.freq;
                    osc = context.createOscillator();
                    osc.frequency.value = freq;
                    osc.type = type;
                    osc.connect(context.destination);
                    osc.start(0);
                    return [4 /*yield*/, asnc.wait(duration)];
                case 1:
                    _c.sent();
                    osc.stop();
                    return [2 /*return*/];
            }
        });
    });
}
/*
   To easily recreate the SOUNDS functions (success/ error/ etc)
   I need to recrete the notes to midi to freq conversions as well
   can work backwards from the play_notes function
 */
// I will represent notes with an object 
function scale_to_midi(n) {
    var x = [0, 0, 2, 4, 5, 7, 9, 11, 12];
    return fp.nth(x, n);
}
export function note_obj_to_midi(n) {
    var num = n.num, mod = n.mod, octave = n.octave;
    var res = scale_to_midi(num) + (12 * octave);
    if (mod) {
        var d = (mod == "#") ? 1 : -1;
        res += d;
    }
    return res;
}
export function note_to_note_obj(n) {
    //converts b5.2 (flat 5th 2 octaves up) into note interface 
    var toks = n.split("\.");
    var octave = 0;
    var mod = null;
    var num = null;
    if (toks.length > 1) {
        octave = Number(toks[1]);
    }
    if (toks[0].length > 1) {
        mod = toks[0][0];
        num = Number(toks[0][1]);
    }
    else {
        num = Number(toks[0][0]);
    }
    return {
        num: num, mod: mod, octave: octave
    };
}
export function note_to_midi(n) {
    return note_obj_to_midi(note_to_note_obj(n));
}
export function note_to_freq(n) {
    return m2f[note_to_midi(n)];
}
export function play_note(n, dur, key) {
    return __awaiter(this, void 0, void 0, function () {
        var offset, midi, freq, duration, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    offset = key ? note_to_midi(key) : 60;
                    midi = note_to_midi(n);
                    freq = m2f[String(offset + midi)];
                    duration = dur || 500;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, tone({ freq: freq, duration: duration })];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    e_1 = _a.sent();
                    console.log("Error playing. You likely played a note outside of currently supported range");
                    console.log(e_1);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
export function play_notes(notes, dur, key) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            notes.map(function (n) { return play_note(n, dur, key); });
            return [2 /*return*/];
        });
    });
}
export function play_notes_delay(notes, delay, dur, key) {
    return __awaiter(this, void 0, void 0, function () {
        var _i, notes_1, n;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _i = 0, notes_1 = notes;
                    _a.label = 1;
                case 1:
                    if (!(_i < notes_1.length)) return [3 /*break*/, 4];
                    n = notes_1[_i];
                    play_note(n, dur, key);
                    return [4 /*yield*/, asnc.wait(delay)];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/];
            }
        });
    });
}
export function success() {
    play_notes(["1", "3"], 400, "3.5");
}
export function error() {
    play_notes(["1", "b5"], 200, "3.5");
}
export function input_ready() {
    play_notes_delay(["1", "3"], 100, 100, "3.5");
}
export function proceed() {
    play_notes(["5.-1"], 100, "3.5");
}
//# sourceMappingURL=sounds.js.map