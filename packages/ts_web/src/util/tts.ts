/* 
 Typescript browser tts   
 Fri Jul  3 02:13:20 PDT 2020
*/

import * as common from "tidyscripts_common"
let {asnc, fp , logger } = common ; 


let log = logger.get_logger({id:"tts"})

declare var window : any ;


export var tts = function(){ return window.speechSynthesis;} ;


export var speech_que : SpeechOps[] = []

export function cancel_speech() {
    log("Canceling speech, and queue")
    speech_que = [ ]   ;
    tts().cancel() ;
    log("Done") 
}      

export async function finished_utterance() {
    
    let timeout = await asnc.wait_until(()=>{
	return (!tts().speaking)
    },Infinity,200)
    return 
}

export async function finished_speaking() {
    
    let timeout = await asnc.wait_until(()=>{
	return (!tts().speaking && speech_que.length < 1)
    },Infinity,200)
    return 
}

export function is_speaking() : boolean {
    return (tts().speaking || (speech_que.length > 0))
} 

interface SpeechOps {
    text : string, 
    voiceURI? : string | null , 
    rate? : number , 
} 

export function get_voices() {
  return tts().getVoices()  ; 
}

export function get_voice(vuri : string) {
    let tmp = tts().getVoices().filter( (v:any)=> v.voiceURI == vuri ) 
    if (tmp.length > 0 ) {
	return tmp[0] 
    } else { 
	return null 
    } 
}

export function get_voice_by_name(name : string) {
    let tmp = tts().getVoices().filter( (v:any)=> v.name == name ) 
    if (tmp.length > 0 ) {
	return tmp[0] 
    } else { 
	return null 
    } 
}

export function voices_ready() {
  try { 
    return (tts().getVoices().length > 0 )  
  } catch (e : any) {
    return false
  } 
}

export async function wait_until_voices_ready() {
  await common.asnc.wait_until(voices_ready, 3000, 200 ) ;
  log("voices_ready") ; 
} 

export var default_rate : number  = 1 ; 

export function set_default_rate(n : number) {
  default_rate = n ;
  log("Default rate set to: " + n )
}

export async function pause_speech() {
    log("pausing speech utterance") ;
    let synth = tts() ;

     if (synth.speaking) {
	 synth.pause();
	 log('Speech paused.');
    } else {
	log('No speech is currently in progress to pause.');
    }
}



export async function resume_speech() {
    log("resuming utterance") ;
    let synth = tts() ;

     if (synth.paused) {
	 synth.resume();
	 log('Speech resumed.');
    } else {
	log('No speech is currently paused.');
    }
}



export async function _speak(ops : SpeechOps) {  
    
    let { 
	voiceURI  , 
        rate = default_rate , 
	text 
    }  = ops 
    
    
    if (! tts().speaking) { 
	var utterance  = new window.SpeechSynthesisUtterance(text);
	
	if (voiceURI)  { 
	    //try to get the 
	    let voice = get_voice(voiceURI) 
	    if (voice) { 
		utterance.voice = voice 
	    }
	} 
	//utterance.pitch = pitch.value;
	utterance.rate =  rate ; 
	tts().speak(utterance); 
	let _ = await finished_utterance() 
	let next = speech_que.shift() 
	if (next) { 
	    //modify ops 
	    _speak(next) 
	} else { 
	    //pass
	    log("done with speech que") 
	}
    } else { 
	log("Scheduling speech for later.")
	speech_que.push(ops)
    }
}

export var chunk_strategy = "sentences"  ;
export function set_chunk_strategy(t : string) {
    log(`Set chunk strategy: ${t}`) 
    chunk_strategy = t ; 
} 

export function speak(ops : SpeechOps) {
     
    let { 
	voiceURI , 
        rate = default_rate , 
	text 
    }  = ops 
    
    log("Request to speak  =:> " + text) 
    log("With voice =:> " + voiceURI) 
    /*chunk up the text by word length */
    var chunks : any  = null ;
    if (chunk_strategy == 'sentences' ) {
	log("splitting text by sentences")
	chunks = text.split("\.")
    } else  {
	log("splitting text by words")	
	chunks = fp.map(fp.partition(fp.split(text," "), 20),fp.joiner(" "))
    }
    
    /* and pass them to the speak function */
    chunks.forEach( function(c :any) {
	let new_ops = (fp.clone(ops) as SpeechOps)
	new_ops.text = c 
	_speak(new_ops) 
    })

} 



