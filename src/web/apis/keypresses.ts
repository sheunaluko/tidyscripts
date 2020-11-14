
import * as common from "../../common/util/index"
import * as sounds from "../util/sounds" 

let log = common.Logger("key_presses")
let fp = common.fp 
let debug = common.debug

declare var window : any ; 


/* 
   
   Utilities for detecting key presses on the browser window 
   
 */


export function load_key_handlers(keymap : any) {
    
    window.onkeypress = function(e :any)  {  
	log("Keypress!") 
	let key = e.key 
	console.log(key) 
	if (keymap[key]) {
	    keymap[key]() 
	} 
	
    } 
} 




