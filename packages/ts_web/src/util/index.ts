import * as common from "tidyscripts_common" 
import * as tts from "./tts" 
import * as speech_recognition from "./speech_recognition" 
import * as sounds from "./sounds" 
import * as audio_processing from "./audio_processing" 
import * as voice_interface from "./voice_interface" 
import * as ws from "./ws" 

declare var window : any ; 


export {
    tts, 
    ws , 
    speech_recognition, 
    sounds, 
    voice_interface , 
    audio_processing
} 

let log = common.logger.get_logger({id:"wutil"}) 
    
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


export async function define(promise : Promise<any>, id : string ) { 
    window[id] = await promise ; 
    log(`Defined ${id} on the window object :)`)
} 


export function hello() {
  console.log("hiiii!") 
} 
