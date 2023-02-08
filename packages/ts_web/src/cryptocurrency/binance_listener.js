(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./binance_ws", "../util/sounds"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.trade_beeper = exports.sell_beep = exports.buy_beep = exports.set_sound_options = exports.sound_options = void 0;
    var binance_ws = require("./binance_ws");
    var sounds = require("../util/sounds");
    exports.sound_options = {
        freq: {
            buy: 620,
            sell: 580,
        },
        duration: {
            buy: 30,
            sell: 30,
        }
    };
    function set_sound_options(s) { exports.sound_options = s; }
    exports.set_sound_options = set_sound_options;
    function buy_beep(gain) {
        sounds.tone({ freq: exports.sound_options.freq.buy, gain: gain, duration: exports.sound_options.duration.buy });
    }
    exports.buy_beep = buy_beep;
    function sell_beep(gain) {
        sounds.tone({ freq: exports.sound_options.freq.sell, gain: gain, duration: exports.sound_options.duration.sell });
    }
    exports.sell_beep = sell_beep;
    function trade_beeper(sym) {
        var handler = function (d) {
            var trade = JSON.parse(d);
            var sell = trade.m, p = trade.p, q = trade.q;
            var tmp = Number(q);
            var gain = (tmp > 1 ? 1 : tmp);
            console.log(trade);
            (sell ? sell_beep(gain) : buy_beep(gain));
        };
        return binance_ws.basic_spot_trade_socket(sym, handler);
    }
    exports.trade_beeper = trade_beeper;
});
