/* 
   Implementing speech recognition for the browser (chrome) 
   Thu Jul  2 09:05:48 PDT 2020
*/ 

declare var window : any 


export interface RecognitionOps {
    continuous? : boolean, 
    interimResults? : boolean, 
    onStart? : ()=>void , 
    onSoundStart? : ()=>void, 
    onResult? : ()=>void, 
    onError? : ()=>void,
    onEnd?  : ()=>void, 
    lang?  : string , 
} 

export function get_recognition_object(ops: RecognitionOps = {})  {
    
    let {continuous = true,
	 interimResults = false,
	 onStart = ()=>{console.log("Recognition started")} ,
	 onSoundStart = ()=>{console.log("Sound started...") },
	 onResult = (e : any)=>{ console.log("Recognition result: " + e.results[e.resultIndex][0].transcript)} , 
	 onError = (e :any)=> {console.log("Recognition error: "); console.log(e);} , 
	 onEnd = ()=> {console.log("Recognition ended")} , 
	 lang = 'en-US' , 
	} = ops  
    
    let rec = new window.webkitSpeechRecognition() 
    
    rec.onsoundstart = onStart ; 
    rec.onresult = onResult ; 
    rec.onerror = onError ;
    rec.onend = onEnd ; 
    rec.continuous = continuous ; 
    rec.interimResults = interimResults ; 
    rec.onstart = onStart ; 
    rec.onsoundstart = onSoundStart ; 
    
    return rec 
    
} 



