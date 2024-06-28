/**
   Wrapper on the MediaRecorder Web API
   (https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)

 * @packageDocumentation
 */

import * as common from "tidyscripts_common"
// -- 
declare var window : any;
declare var MediaRecorder : any;
const log = common.logger.get_logger({id : 'media_recorder'}) ;
export function is_supported() { return (window.navigator.mediaDevices ? true : false )  }  
export var _recorder : any = null ; 
// --  
export async function get_recorder_object() {
    if (_recorder) { return _recorder } 
    if (! is_supported() ) { log(`NOT SUPPORTED`) ; return }  ;

    //get media stream 
    let stream = await navigator.mediaDevices.getUserMedia({audio:true}) ;
    _recorder = new MediaRecorder(stream)  ;
    return _recorder 
}
// -- 
export async function start_recording(cb : any , interval_ms :number) {
    let recorder = await get_recorder_object()  ;
    recorder.addEventListener('dataavailable',async function(e:any){cb(await e.data) })
    recorder.start(interval_ms) ;
    log(`Recording started`)    
}
// -- 
export async function stop_recording() {
    let recorder = await get_recorder_object() ;
    recorder.stop() ;
    log(`Recording stopped`)
}
export async function pause_recording() {
    let recorder = await get_recorder_object()  ;
    recorder.pause() ;
    log(`Recording paused`)    
}
// -- 
export async function resume_recording() {
    let recorder = await get_recorder_object() ;
    recorder.resume() ;
    log(`Recording resumed`)
}
// -- 
export async function get_current_data() {
    let recorder = await get_recorder_object() ;
    return recorder.requestData() ;
}
// -- 
export async function get_recorder_state() {
    let recorder = await get_recorder_object() ;   return recorder.state ; 
} 
