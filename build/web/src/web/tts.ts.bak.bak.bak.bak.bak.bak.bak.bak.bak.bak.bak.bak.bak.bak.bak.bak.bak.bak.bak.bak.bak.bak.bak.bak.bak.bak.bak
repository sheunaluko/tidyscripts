/* 
 Typescript browser tts   
 Fri Jul  3 02:13:20 PDT 2020
 */ 


import * as asnc from "../common/util/async" 
import * as fp from "../common/util/fp" 


declare var window : any ;


export var tts = window.speechSynthesis;
export var speech_que : SpeechOps[] = []


export async function finished_utterance() {
    
    let timeout = await asnc.wait_until(()=>{
	return (!tts.speaking)
    },Infinity,200)
    return 
}

export async function finished_speaking() {
    
    let timeout = await asnc.wait_until(()=>{
	return (!tts.speaking && speech_que.length < 1)
    },Infinity,200)
    return 
}

export function is_speaking() : boolean {
    return tts.speaking
} 

interface SpeechOps {
    text : string, 
    voice? : number ,
    rate? : number , 
} 

export async function _speak(ops : SpeechOps) {  
    
    let { 
	voice  = 49, 
	rate = 1 , 
	text 
    }  = ops 
    
    
    if (! tts.speaking) { 
	var utterance  = new window.SpeechSynthesisUtterance(text);
	utterance.voice = tts.getVoices()[voice] 
	//utterance.pitch = pitch.value;
	utterance.rate =  rate ; 
	tts.speak(utterance); 
	let _ = await finished_utterance() 
	let next = speech_que.shift() 
	if (next) { 
	    //modify ops 
	    _speak(next) 
	} else { 
	    //pass
	    console.log("done with speech que") 
	}
    } else { 
	console.log("Scheduling speech for later.")
	speech_que.push(ops)
    }
}

export function speak(ops : SpeechOps) {
     
    let { 
	voice  = 49, 
	rate = 1 , 
	text 
    }  = ops 
    
    console.log("Request to speak  =:> " + text) 
    /*chunk up the text by word length */ 
    let chunks = fp.map(fp.partition(fp.split(text," "), 20),fp.joiner(" "))
    
    /* and pass them to the speak function */
    chunks.forEach( function(c :any) {
	let new_ops = (fp.clone(ops) as SpeechOps)
	new_ops.text = c 
	_speak(new_ops) 
    })

} 



