
import * as binance_ws from "./binance_ws" 
import * as sounds from "../util/sounds" 


interface SoundOps {
    freq : { 
	buy : number, 
	sell : number , 
    } , 
    duration : { 
	buy : number, 
	sell : number, 
    } 
} 

export var sound_options : SoundOps = { 
    freq : {
	buy : 620 , 
	sell : 580 , 
    } , 
    duration : { 
	buy : 30 , 
	sell : 30, 
    } 
} 

export function set_sound_options(s : SoundOps) {  sound_options = s }  

export function buy_beep(gain? : number) {
    sounds.tone({freq: sound_options.freq.buy, 
		 gain, 
		 duration: sound_options.duration.buy})
} 

export function sell_beep(gain? :number) {
    sounds.tone({freq: sound_options.freq.sell, 
		 gain,
		 duration: sound_options.duration.sell})
} 

export function trade_beeper(sym : string) { 
    let handler = function(d : any) {
	let trade = JSON.parse(d) 
	
	let { m : sell, 
	      p , 
	      q , } = trade  
	
	let tmp = Number(q) 
	
	let gain = ( tmp > 1 ? 1   : tmp ) 
	
	console.log(trade) ; 
	
	(sell ? sell_beep(gain) : buy_beep(gain) )

    } 
    
    return binance_ws.basic_spot_trade_socket(sym,handler) 
    
} 
