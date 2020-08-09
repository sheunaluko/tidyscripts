


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

export {tts, 
	ws , 
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



