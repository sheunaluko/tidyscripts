// @ts-nocheck

import * as common from "tidyscripts_common" 
import * as sounds from "../util/sounds" 
import * as kp from "./keypresses" 

let log = common.logger.get_logger({id:"key_sounds"})
let fp = common.fp 
let debug = common.util.debug
declare var window : any ; 

var hi = [ "q","w","e","r","t","y","u","i","o","p", "[" ] 
var mid = ["a","s","d","f","g","h","j","k","l",";"]
var lo  = ["z","x","c","v","b","n","m", "," ]


export var keys : {[k:string] : string[]} = { 
    hi, mid, lo 
} 

type kdata =   { 
    [k : string] : string[] 
} 


export function keys_to_notes_1(key_data : kdata) {
    
    let all_ks = lo.concat(mid).concat(hi) 
    let octave = 0
    let notes :any  =  {}
    //@ts-ignore 
    for (var x :any of fp.enumerate(all_ks)) {
	if (x[0] % 7 == 0 ) { octave += 1 }
	let note_num = x[0] % 7 +1 
	let note = fp.format("{}.{}", [note_num, octave])
	notes[x[1]] = note 
    } 
    return notes 
} 

export function sound_key_handler(key_map : any,dur : number = 30,bk :string = "1.4") { 
    let hs  : {[k:string] : any} = {}  
    for (var d of fp.dict_to_list(key_map) ) {
	//console.log(d) 
	let k = d[0]
	let v = d[1] 
	//log("Adding k " + k + " and v = "  + v ) 
	hs[k] = function() {
	    log(String(v)) 
	    sounds.play_note(String(v),dur,bk)
	} 
    } 
    return hs 
} 

export function load_sound_key_handler(dur : number = 30 , bk : string = "1.4") { 
    let km = sound_key_handler(keys_to_notes_1(keys),dur,bk)
    //log("km is: " ) 
    //console.log(km)
    kp.load_key_handlers(km)
    debug.add("km", km) 
} 
