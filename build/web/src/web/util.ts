


import * as common from "../common/util/index" ; //common utilities  

export {common } 


import {Success,
	Error, 
	AsyncResult} from "../common/util/types" 


import * as tts from "./tts" 
import * as speech_recognition from "./speech_recognition" 
import * as sounds from "./sounds" 
import * as audio_processing from "./audio_processing" 
import * as voice_interface from "./voice_interface" 



export {tts, 
	speech_recognition, 
	sounds, 
	voice_interface , 
	audio_processing} 

let log = common.Logger("wutil") 
    

export function alert(s : string) { 
    log("Alerting web page!") 
    window.alert(s) 
} 



