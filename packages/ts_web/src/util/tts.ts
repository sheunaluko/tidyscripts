/* 
 Typescript browser tts   
 Fri Jul  3 02:13:20 PDT 2020
*/

import * as common from "tidyscripts_common"
let {asnc, fp } = common ; 


declare var window : any ;


export var tts = function(){ return window.speechSynthesis;} ; 
export var speech_que : SpeechOps[] = []


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


export function get_voice(vuri : string) {
    let tmp = tts().getVoices().filter( (v:any)=> v.voiceURI == vuri ) 
    if (tmp.length > 0 ) {
	return tmp[0] 
    } else { 
	return null 
    } 
} 

export async function _speak(ops : SpeechOps) {  
    
    let { 
	voiceURI  , 
	rate = 1 , 
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
	    console.log("done with speech que") 
	}
    } else { 
	console.log("Scheduling speech for later.")
	speech_que.push(ops)
    }
}

export function speak(ops : SpeechOps) {
     
    let { 
	voiceURI , 
	rate = 1 , 
	text 
    }  = ops 
    
    console.log("Request to speak  =:> " + text) 
    console.log("With voice =:> " + voiceURI) 
    /*chunk up the text by word length */ 
    let chunks = fp.map(fp.partition(fp.split(text," "), 20),fp.joiner(" "))
    
    /* and pass them to the speak function */
    chunks.forEach( function(c :any) {
	let new_ops = (fp.clone(ops) as SpeechOps)
	new_ops.text = c 
	_speak(new_ops) 
    })

} 



