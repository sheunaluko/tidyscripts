/* 
 Typscript sound synthesis module for web   
 Fri Jul  3 03:03:50 PDT 2020
 Sheun Aluko 
*/

import * as fp from "../../common/util/fp" 
import * as asnc from "../../common/util/async" 
import {m2f} from "./midi2freq" 


export {m2f}

declare var window : any  ; 


let audio_context = window.AudioContext || window.webkitAudioContext
export var context = new audio_context() 

interface tone_ops { 
    type? : string, 
    freq : number , 
    duration? : number , 
    gain? : number ,
    delay? : number,
    
} 

export async function tone(ops : tone_ops ){ 
    let { type = "sine" ,
	  duration = 600 , 
	  gain = 0.5 , 
	  delay , 
	  freq ,   } = ops 
    
    var osc = context.createOscillator() 
    osc.frequency.value = freq 
    osc.type = type 
    
    var gainNode  = context.createGain();

    if (delay) { 
	var delayNode = context.createDelay();
	delayNode.delayTime.value = delay
	gainNode.connect(delayNode);
	delayNode.connect(context.destination)
    }
    
    gainNode.gain.value = gain ; 
    
    osc.connect(gainNode) 
    gainNode.connect(context.destination) 
    
    osc.start(0)
    await asnc.wait(duration) 
    osc.stop() 
    
} 


/* 
   To easily recreate the SOUNDS functions (success/ error/ etc) 
   I need to recrete the notes to midi to freq conversions as well 
   can work backwards from the play_notes function 
 */ 


// I will represent notes with an object 

function scale_to_midi(n : number) : number { 
    let x = [0,0,2,4,5,7,9,11,12] 
    return fp.nth(x,n) 
} 

interface note {
    num : number, 
    mod : string | null, 
    octave : number , 
} 


export function note_obj_to_midi(n : note) { 
    let {num,mod,octave} = n 
    
    let res = scale_to_midi(num) + (12*octave) 
    if (mod) {
	let d =  (mod == "#") ? 1 : -1 
	res += d 
    } 
    
    return res 
} 


export function note_to_note_obj(n : string) : note {
    //converts b5.2 (flat 5th 2 octaves up) into note interface 
    let toks = n.split("\.") 
    var octave = 0 
    var mod = null 
    var num = null
    if (toks.length > 1 ) {
	octave = Number(toks[1]) 
    } 
    
    if (toks[0].length > 1 ) {
	mod = toks[0][0]
	num = Number(toks[0][1])
    } else { 
	num = Number(toks[0][0])
    } 
    
    return { 
	num,mod,octave 
    } 
    
    
} 


export function note_to_midi(n :string) : number {
    return note_obj_to_midi(note_to_note_obj(n)) 
} 

export function note_to_freq(n : string) : number { 
    return m2f[note_to_midi(n)] 
} 

export async function play_note(n : string, dur? : number, key?: string) {
    
    console.log(fp.format("note | n= {}, dur={}, k={}", [n,dur,key]) )
    
    let offset = key ? note_to_midi(key)  : 60 
    let midi = note_to_midi(n) 
    let freq = m2f[String(offset+midi)]
    let duration = dur || 500 
    try { 
	await tone({ freq  , duration })
    } catch (e) {
	console.log("Error playing. You likely played a note outside of currently supported range")
	console.log(e)
	console.log("freq + duration:")
	console.log({freq,duration}) 
    } 
} 

export async function play_notes(notes : string[], dur? : number, key? : string) {
    notes.map(n=>play_note(n,dur,key))
} 

export async function play_notes_delay(notes : string[], delay :number , dur? : number, key? : string) {
    for (var n of notes) { 
	play_note(n,dur,key) 
	await asnc.wait(delay) 
    }

} 


export function success() {
    play_notes(["1" , "3"],400,"3.5") 
} 

export function error() {
    play_notes(["1" , "b5"],200,"3.5") 
} 

export function input_ready() {
    play_notes_delay(["1", "3"],100, 100, "3.5")
}

export function proceed() {
    play_notes(["5.-1"],100,"3.5")
} 

