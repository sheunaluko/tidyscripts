


import * as common from "../../common/util/index.ts" ; //common utilities  

export {common } 


import {Success,
	Error, 
	AsyncResult} from "../../common/util/types.ts" 


import * as tts from "./tts.ts" 
import * as speech_recognition from "./speech_recognition.ts" 
import * as sounds from "./sounds.ts" 
import * as audio_processing from "./audio_processing.ts" 
import * as voice_interface from "./voice_interface.ts" 
import * as ws from "./ws.ts" 
import * as http from "./base_http.ts" 
import {ExternalLogger}  from "./ext_log.ts" 

export {tts, 
	ws , 
	ExternalLogger, 
	http , 
	speech_recognition, 
	sounds, 
	voice_interface , 
	audio_processing} 

let log = common.Logger("wutil") 
    

export function alert(s : string) { 
    log("Alerting web page!") 
    window.alert(s) 
} 

export function is_chrome() {
    return  /Chrome/.test(window.navigator.userAgent) && /Google Inc/.test(navigator.vendor);
} 

export function is_mobile() {
    return /Mobi/.test(window.navigator.userAgent)
}


// from https://stackoverflow.com/questions/105034/how-to-create-guid-uuid => 
export function uuid() {
    var buf = new Uint32Array(4);
    window.crypto.getRandomValues(buf);
    var idx = -1;
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        idx++;
        var r = (buf[idx>>3] >> ((idx%8)*4))&15;
        var v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
};


