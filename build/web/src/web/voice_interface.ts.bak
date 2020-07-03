

/* 
 Main voice interface for controlling speech recognition and tts at high level 
 */

import * as sr from "./speech_recognition.ts" 
import * as tts from "./tts.ts" 
import * as ap from "./audio_processing.ts" 


/* 
 audio_processing.ts    | connects to microphone and detects when there is sound occuring 
 speech_recognition.ts  | starts and stops speech recognition and provides recognition results 
 tts.ts                 | will perform speech synthesis given a string 
*/ 

var recognition : any  = null 

export function initialize_recognition(ops? : sr.RecognitionOps) {
    recognition = sr.get_recognition_object(ops || {})
    return 
}

export function stop_recognition() {
    if (recognition) {
	recognition.abort() 
    } 
} 

export async function start_recognition() {
    //if tts is speaking then we should wait 
    await tts.finished_speaking() 
    if (recognition) {
	recognition.start() 
    } else { 
	initialize_recognition()
	console.log("Recognition initialized without args") 
    } 
} 


export async function speak(text : string) {
    if (recognition) {
	stop_recognition() 
	tts.speak({text})
	await tts.finished_speaking()
	start_recognition()
    } else { 
	tts.speak({text})
	await tts.finished_speaking()
    } 
    return 
} 

