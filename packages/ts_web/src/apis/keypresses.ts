import * as common from "tidyscripts_common" 
import * as sounds from "../util/sounds" 

let log = common.logger.get_logger({id:"key_presses"})
let fp = common.fp 
let debug = common.util.debug

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




