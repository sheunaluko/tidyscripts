


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

declare var window : any ; 

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




export async function define(promise : Promise, id : string ) { 
    window[id] = await promise ; 
    log(`Defined ${id} on the window object :)`)
} 



export function automate_input(id : string, q : string) { 
    
    /* 
       Interesting discussion here about programmatically triggering onChange for react input elements 
       https://hustle.bizongo.in/simulate-react-on-change-on-controlled-components-baa336920e04
     */ 
    let input = (document.getElementById(id) as any) 
    if (input) { 
	var nativeInputValueSetter = (Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value") as any).set;
	nativeInputValueSetter.call(input, q);
	var inputEvent = new Event('input', { bubbles: true});
	input.dispatchEvent(inputEvent);
    } 
    
} 
