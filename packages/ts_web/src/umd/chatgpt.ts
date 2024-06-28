/**
 * Interface for modifying chat.openai.com/chat for voice functionality 
 */

import * as vi from "../util/voice_interface" ;
import * as common from "tidyscripts_common" ;

declare var document : any ;
declare var window   : any ; 


export function input_area() { 
  return document.querySelector("textarea")
}

export function set_input(value : string) {
  input_area().value = value ; 
}

export function click_input() {
  input_area().parentElement.querySelector("button").click()
} 

/**
 * Submits a message to chatgpt 
 */
export function enter_input(msg : string) {
  set_input(msg); click_input() ;
}

export function start_speech_recognition_and_link_to_input() {
  //prep the listener 
  window.addEventListener("tidyscripts_web_speech_recognition_result" ,
			  function(e : any) { enter_input(e.detail) } ) ;
  //now we initialize the voice recognition
  vi.initialize_recognition() ; 
} 

var response_loop : any = null ;
var response_txt : string = "" ;

export function new_text_handler(text : string) {
  console.log("new text:" + text) ; 
}

export function speech_text_handler(text : string) {
  vi.speak( text) ; 
}

export function speak(text:string) {
  vi.speak(text) ; 
} 

export function finish_stream_handler() {
  console.log("finished stream")
  vi.initialize_recognition() ; 
} 

export function monitor_responses(t : number, speak : boolean) {
  let timing = t ;
  response_loop = window.setInterval( function() {
    let current_stream = document.querySelector(".result-streaming")
    if (current_stream) {
      //something is streaming
      let current_text = current_stream.innerText ;
      let new_text     = current_text.replace(response_txt, "") ;
      speak ? speech_text_handler(new_text) :  new_text_handler(new_text) ; 
      response_txt = current_text ; //important to set this 
    } else {
      //nothing is streaming
      if (response_txt == "" ) {  /* waiting */  }
      else { /*just finished stream */
	//will check for final text
	let final_el = common.fp.last(Array.from(document.querySelectorAll("div.markdown"))) as any 
	let new_text     = (final_el.innerText as string).replace(response_txt, "") ;
	speak ? speech_text_handler(new_text) :  new_text_handler(new_text) ;
	response_txt = "" ; 
	finish_stream_handler()  ;
      } 
    } 
  } , timing )
  
}

export var voice_preference_order : string [] = [
  "Google UK English Female" ,
  "Google UK English Male" ,
  "Google UK English" ,
  "Karen" ,
  "Rishi" , 
]

export function stop_monitoring() {
  window.clearInterval(response_loop) ; 
}

export function adjust_tts_rate(n :number) {
  vi.set_default_tts_rate(n) ; 
} 

export async function configure_tts() {
  await vi.tts.wait_until_voices_ready()
  vi.set_default_tts_rate(1.3) ; 
  vi.set_default_voice_from_name_preference_list(voice_preference_order) ; 
} 

export var default_monitoring_interval = 2000 ; 

export async function initialize_voice_system() {
  start_speech_recognition_and_link_to_input(); 
  await configure_tts() ; 
  monitor_responses(default_monitoring_interval, false) ; 
}

export async function initialize_voice_system_with_tts() {
  start_speech_recognition_and_link_to_input() ;
  await configure_tts() ; 
  monitor_responses(default_monitoring_interval, true) ; 
}
