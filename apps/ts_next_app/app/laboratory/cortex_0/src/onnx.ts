'use client';

import * as ort from 'onnxruntime-web/wasm'  //need the wasm import for silero compat! 
import * as common from "tidyscripts_common"  ;
import {TSVAD} from "./ts_vad/src" ;




// configures where ortw looks for wasm and mjs files 
ort.env.wasm.wasmPaths = '/onnx/';
ort.env.wasm.mjs = '/onnx/' ;
ort.env.logLevel = 'error' ; 

const log  = common.logger.get_logger({id:"onnx"}) ; 

export function get_ort() {
       return ort  
}      

export async function enable_vad() {
    let silero = await get_silero_session() ;

    let onSpeechStart = () => {
	log(`Detected speech start will cancel audio if speeaking`) ;

	let speaking = tsw.util.voice_interface.tts.is_speaking()
	log(`Is speaking=${speaking}`)
	if (speaking) {
	    log(`Canceling...`) 
	    tsw.util.voice_interface.tts.cancel_speech()
	}

    }
    
    let vad    = new TSVAD({silero, onSpeechStart}) ;

    vad.start() ; 
    return vad; 
}

export async function get_silero_session() {
    log(`Getting silero session`)
    const session = await ort.InferenceSession.create('/onnx/silero_vad_v5.onnx' )
    log(`Returning`)
    return session 
}


export {
    TSVAD 
}
