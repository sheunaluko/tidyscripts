import * as common from "tidyscripts_common"
import * as tts from "./tts"
import * as speech_recognition from "./speech_recognition"
import * as sounds from "./sounds"
import * as audio_processing from "./audio_processing"
import * as voice_interface from "./voice_interface"
import * as ws from "./ws"
import * as dom from "./dom"

declare var window: any;



export {
  tts,
  ws,
  speech_recognition,
  sounds,
  voice_interface,
  audio_processing,
  dom
}

let log = common.logger.get_logger({ id: "wutil" })

export function alert(s: string) {
  log("Alerting web page!")
  window.alert(s)
}

export function is_chrome() {
  return /Chrome/.test(window.navigator.userAgent) && /Google Inc/.test(navigator.vendor);
}

export function is_mobile() {
  return /Mobi/.test(window.navigator.userAgent)
}

// from https://stackoverflow.com/questions/105034/how-to-create-guid-uuid => 
export function uuid() {
  var buf = new Uint32Array(4);
  window.crypto.getRandomValues(buf);
  var idx = -1;
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    idx++;
    var r = (buf[idx >> 3] >> ((idx % 8) * 4)) & 15;
    var v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};


export async function define(promise: Promise<any>, id: string) {
  window[id] = await promise;
  log(`Defined ${id} on the window object :)`)
}


/**
 * Add a script into the current web page 
 *
 */
export function add_script(src: string) {
  return new Promise((resolve, reject) => {
    const s = window.document.createElement('script');
    s.setAttribute('src', src);
    s.addEventListener('load', resolve);
    s.addEventListener('error', reject);
    document.body.appendChild(s);
  });
}


/**
 * Inject a script into the current web page 
 *
 */
type InjectScriptOps = {
    src : string,
    attributes : { [k:string] : any } 
} 
export function inject_script(ops : InjectScriptOps ) {
    return new Promise((resolve, reject) => {
	const s = window.document.createElement('script');
	s.setAttribute('src', ops.src);
	let attributes = ops.attributes ;
	if (attributes) {
	    let a_keys = Object.keys(attributes)	  
	    for (let key of a_keys) {
		s.setAttribute(key, attributes[key])
	    } 
	}
	s.addEventListener('load', resolve);
	s.addEventListener('error', reject);
	document.body.appendChild(s);
    });
}


/**
 * Inject a css stylesheet into the page 
 *
 */
export function add_css(src: string) {
  return new Promise((resolve, reject) => {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = src;
    link.media = 'all';
    link.addEventListener('load', resolve);
    link.addEventListener('error', reject);
    var head = document.getElementsByTagName('head')[0];
    head.appendChild(link);
  });
}


