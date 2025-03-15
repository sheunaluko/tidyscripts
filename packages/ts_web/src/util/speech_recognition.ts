/* 
   Implementing speech recognition for the browser (chrome) 
   Thu Jul  2 09:05:48 PDT 2020
*/ 


import * as common from "tidyscripts_common"
let {asnc, fp , logger } = common ; 
let log = logger.get_logger({id:"speech"})

declare var window : any 


export interface RecognitionOps {
    continuous? : boolean, 
    interimResults? : boolean, 
    onStart? : ()=>void , 
    onSoundStart? : ()=>void, 
    onSoundEnd? : ()=>void,     
    onSpeechStart? : ()=>void, 
    onSpeechEnd? : ()=>void,     
    onResult? : ()=>void, 
    onError? : ()=>void,
    onEnd?  : ()=>void, 
    lang?  : string , 
    result_dispatch? : string ,
    interim_dispatch? : string ,     
} 

export function get_recognition_object(ops: RecognitionOps = {})  {
    
    let {
	result_dispatch = "tidyscripts_web_speech_recognition_result",
	interim_dispatch = "tidyscripts_web_speech_recognition_interim",	
	 
    } = ops 
    
    let {continuous = true,
	 interimResults = true,
	 onStart = ()=>{log("Recognition started")} ,
	 onSoundStart = ()=>{log("Sound started...") },
	 onSoundEnd = ()=>{log("Sound ended...") },	 
	 onSpeechStart = ()=>{log("Speech started...") },
	 onSpeechEnd = ()=>{log("Speech ended...") },	 
	 onResult = function(event : any) {

	     let interimTranscript = '';
	     let finalTranscript = '';

	     for (let i = event.resultIndex; i < event.results.length; ++i) {
		 if (event.results[i].isFinal) {
		     log(`GOT FINAL RESULT`)
		     finalTranscript += event.results[i][0].transcript;
		     log("Recognition result: " + finalTranscript)	     
		     window.dispatchEvent( new CustomEvent(result_dispatch, { detail : finalTranscript } ) ) 
		     
		 } else {

		     interimTranscript += event.results[i][0].transcript;
		     //log(`GOT INTERIM RESULT: ${interimTranscript}`)
		     window.dispatchEvent( new CustomEvent(interim_dispatch, { detail : interimTranscript } ) )
		 }
	     }


	 } , 
	 onError = (e :any)=> {log("Recognition error: "); console.log(e);} , 
	 onEnd = ()=> {log("Recognition ended")} , 
	 lang = 'en-US' , 
	} = ops  
    
    let rec = new window.webkitSpeechRecognition() 
    


    rec.onresult = onResult ; 
    rec.onerror = onError ;
    rec.onend = onEnd ; 
    rec.continuous = continuous ; 
    rec.interimResults = interimResults ; 
    rec.onstart = onStart ; 
    rec.onsoundstart = onSoundStart ; 
    rec.onsoundend = onSoundEnd  ; 
    rec.onspeechstart = onSpeechStart; 
    rec.onspeechend = onSpeechEnd ; 

    
    return rec 
    
} 



