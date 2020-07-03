import * as mic from "./browser_mic";
import * as dsp from "../common/util/dsp";
import * as perf from "../common/util/performance";
/*
   note that the microphone will dispatch events to window.tidyscripts_web_mic
   when connected
 */
export function start_power() { mic.connect(function (buf) { return dsp.power(buf); }, 'tidyscripts_web_mic'); }
export var listeners = [];
export function audio_detector(cb, thresh) {
    //first we start the detection 
    //and automatically calculate the audio power 
    start_power();
    var last_val = 0;
    var start_time = perf.ms();
    var f = function (e) {
        var power = e.detail;
        if (last_val == 0) {
            last_val = power;
            return;
        }
        var pchange = (100) * (power / last_val);
        var elapsed = perf.ms() - start_time;
        if (elapsed > 2000 && pchange > (thresh || 1000)) {
            cb();
        }
        else {
            //nothing 
        }
        last_val = power;
    };
    //now we listen for the event 
    window.addEventListener('tidyscripts_web_mic', f);
    //and keep track of it
    listeners.push(['tidyscripts_web_mic', f]);
}
export function stop() {
    mic.disconnect();
    //remove listeners 
    for (var _i = 0, listeners_1 = listeners; _i < listeners_1.length; _i++) {
        var l = listeners_1[_i];
        window.removeEventListener(l[0], l[1]);
    }
    listeners = [];
}
//# sourceMappingURL=audio_processing.js.map