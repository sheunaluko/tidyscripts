/**
   
 Main voice interface for controlling (Web Browser) speech recognition and tts at high level. 

 **Warning:** Please note that only Chrome and Safari currently support the browser Speech Recognition API. You CANNOT use Brave, Firefox, or other browsers. 


 \
 ```audio_processing.ts``` 


 Connects to microphone and detects when there is sound occuring 

 \
 ```speech_recognition.ts```


 Starts and stops speech recognition and provides recognition results 

 \
 ```tts.ts```


 Performs speech synthesis given a string 



 

 This file combines the three aforementioned libraries to create an out of the box seamless 
 voice/ tts experience. 
 
 The audio processor is used to detect when a spike in volume has occured, and it triggers 
 the speech recognizer to start listening. 
 
 When the tts.speak function is called, the speech recognizer is automatically paused until tts 
 has finished. 
 
 To use, simply call initialize_recognition() , and the recognition results will be available by 
 listending to the window.addEventListener( 'tidyscripts_web_speech_recognition_result' , (e) => e.detail ) handler 
 
 For tts, call speak(text)  

 * @packageDocumentation
 */



import * as sr from "./speech_recognition" 
import * as tts from "./tts" 
import * as ap from "./audio_processing" 

import * as LS from "../apis/local_storage" ; 

import {logger} from "tidyscripts_common"

var log = logger.get_logger({id : "voice_interface"}) ; 

export var recognition : any  = null 

export var listen_while_speaking = false ; 

export enum RecognitionState {
    NULL = "NULL", 
    STOPPED = "STOPPED", 
    PAUSED = "PAUSED" ,  
    LISTENING = "LISTENING", 
    STOPPING = "STOPPING" , 
}
export var recognition_state : RecognitionState = RecognitionState.NULL 

export function set_listen_while_speaking(val : boolean) {
    log(`Set listen_while_speaking=${val}`) ; 
    listen_while_speaking = val ; 
}


export function initialize_recognition(ops? : sr.RecognitionOps) {
    
    stop_recognition()
	
    ops = ops || {} 
    
    let old_on_end = ops.onEnd 

    ops.onEnd = function() {
	
	if (recognition_state == RecognitionState.STOPPING) {
	    log("Recognition stopped") 
	    recognition_state = RecognitionState.STOPPED 
	} else { 
	    recognition_state = RecognitionState.PAUSED 
	    log("Recognition paused") 
	} 
	
	//any other on end callbacks 
	old_on_end ? old_on_end() : null 
    } 
    
    recognition = sr.get_recognition_object(ops)
    recognition_state = RecognitionState.PAUSED
    //now we start the audio detector
    ap.audio_detector(start_recognition) 
    return 
}

export function pause_recognition() {
    if (recognition) {
	recognition.abort() 
	recognition_state = RecognitionState.PAUSED
    } 
} 

export function stop_recognition() {
    if (recognition) {
	log("Stopping recognition")
	recognition_state = RecognitionState.STOPPING
	recognition.abort()
	recognition = null
	ap.stop()	
    } 

} 

export async function start_recognition() {

    if (recognition_state == RecognitionState.LISTENING) {
	//console.log("Already listening")
	return 
    } 

    //if tts is speaking then we should wait     
    if (tts.is_speaking()) {
	log("Wont start recognition while tts active")
    }
    
    if (recognition) {
	recognition.start() 
    } else { 
	initialize_recognition()
	log("Recognition initialized without args") 
    } 
    recognition_state = RecognitionState.LISTENING
} 

export function stop_recognition_and_detection() {
    let ap_thresh = ap.detection_threshold 
    pause_recognition() 
    ap.set_detection_threshold(Infinity) //stop the detection 
    return ap_thresh 
} 

export function start_recognition_and_detection(t : number) {
    start_recognition() 
    ap.set_detection_threshold(t) 
}


export function set_default_voice_uri(v : string) {
    LS.store('default_voice_uri', v) 
}

export function set_default_tts_rate(n :number) {
  tts.set_default_rate(n) ; 
} 

export function set_default_voice_from_name_preference_list(l : string[]) {
  for (var voice of l ) {
    let match = tts.get_voice_by_name(voice) ;
    if (match ) {
      set_default_voice_uri(match.voiceURI) ; log(`Set default voice to: ${match.name}`); return 
    } else {
      //
    } 
  }
  log(`Unable to set default voice to any matching name in provided list`) ; 
} 

export async function speak_with_voice(text :string,voiceURI : string | null,rate : number) {
    if (recognition) {

	if (listen_while_speaking) {
	    log(`Listening while speaking`)
	    tts.speak({text, voiceURI , rate})
	    await tts.finished_speaking()
	} else {
	    log(`Stopping listening while speaking`)
	    let thresh  = stop_recognition_and_detection() 	    
	    tts.speak({text, voiceURI , rate})
	    await tts.finished_speaking()
	    start_recognition_and_detection(thresh)	    
	}

    } else { 
	tts.speak({text, voiceURI, rate})
	await tts.finished_speaking()
    } 
    return     
} 

export async function speak(text : string) {
    let voice_uri = LS.get('default_voice_uri') 
    speak_with_voice(text,voice_uri, tts.default_rate) 
}

export async function speak_with_rate(text : string, rate : number) {
    let voice_uri = LS.get('default_voice_uri') 
    speak_with_voice(text,voice_uri, rate)   
} 


export {tts, sr, ap  } ; 
