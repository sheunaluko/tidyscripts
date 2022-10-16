
import * as mic from "./browser_mic" 

import * as common from "tidyscripts_common"

let {dsp, performance} = common.util ; 


/* 
   note that the microphone will dispatch events to window.tidyscripts_web_mic 
   when connected 
 */ 
export function start_power() { mic.connect((buf : any) => dsp.power(buf), 'tidyscripts_web_mic')} 

type listener = [string, any] 

export var listeners : listener[] = [] 

export var detection_threshold  = 1000 

export function set_detection_threshold(t : number) {
    detection_threshold = t 
} 

export function audio_detector(cb : any,thresh? : number) {
    //first we start the detection 
    //and automatically calculate the audio power 
    start_power() 
    
    if (thresh) {
	set_detection_threshold(thresh) 
    } 
    
    var last_val = 0 
    var start_time = performance.ms() 
    
    let f = (e :any) => { 
	let power = e.detail  
	
	if (last_val == 0 ) { last_val = power; return }
	
	let pchange = (100)*(power/last_val) 
	let elapsed = performance.ms()- start_time 
	
	if ( elapsed > 600 && pchange > detection_threshold ) {
	    cb() 
	} else{ 
	    //nothing 
	} 
	last_val = power 	
    }
	
    //now we listen for the event 
    window.addEventListener('tidyscripts_web_mic' , f ) 
    //and keep track of it
    listeners.push(['tidyscripts_web_mic' , f ]) 
}


export function stop() {
    mic.disconnect() 
    
    //remove listeners 
    for (var l of listeners) {
	window.removeEventListener(l[0],l[1]) 
    } 
    
    listeners = [] 
} 
