/* 
   Wrapper around grabbing the mic input and exposing the buffer callback 
   mic.connect(cb) 
   mic.disconnect() 
   Sun Mar  3 11:36:55 PST 2019 => Fri Jul  3 10:08:07 PDT 2020 (upgrade to TS) 
 */

import * as common from "tidyscripts_common"

const log = common.logger.get_logger({ id: "mic" }) ; 

declare var window : any ;


interface AudioPrimitives { 
    context : any, 
    source : any, 
    processor :any ,
    stream : any ,
    mic_sample_rate : any , 
} 

export var audio_primitives : AudioPrimitives = { 
    context : null, 
    source : null, 
    processor : null , 
    stream  : null ,
    mic_sample_rate : null , 
}

var handleSuccess = function(f : any,event_name: string) { //f is the audio buffer handler
    return function(stream : any) {

	audio_primitives.stream = stream 

	audio_primitives.context = new window.AudioContext();
	audio_primitives.source = audio_primitives.context?.createMediaStreamSource(stream);
	audio_primitives.processor = audio_primitives.context?.createScriptProcessor(1024, 1, 1);

	audio_primitives.source?.connect(audio_primitives.processor);
	audio_primitives.processor?.connect(audio_primitives.context?.destination);

	audio_primitives.processor.onaudioprocess = function(e : any) {
	    let val = f(e.inputBuffer.getChannelData(0))
	    const evt = new window.CustomEvent(event_name, {
		detail : val 
	    })
	    window.dispatchEvent(evt)
	    
	};

	//determine the sample rate
	// @ts-ignore
	let sr = stream.getAudioTracks()[0].getSettings().sampleRate; 
	audio_primitives.mic_sample_rate = sr ;
	log(`Determined sample rate of mic : ${audio_primitives.mic_sample_rate}`) ;	

    };
}

export function connect(f : any, event_name?: string) {  //f is the audio buffer handler 
    let name = event_name || 'tidyscripts_web_mic'
    window.navigator.mediaDevices.getUserMedia({ audio: true, video: false })
	  .then(handleSuccess(f,name));
}

export function disconnect() { 

    let ctx = audio_primitives.context 

    if (ctx) { 
	ctx.close() 
    } 

    audio_primitives = { 
	context : null, 
	source : null, 
	processor : null , 
	stream  : null ,
	mic_sample_rate : null, 
    }
    
}


