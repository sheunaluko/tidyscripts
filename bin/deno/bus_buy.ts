

import {main} from "../../src/deno/apis/binanceus/index.ts" 
import {asnc} from "../../src/common/util/index.ts" 
import {get_logger} from "../../src/deno/io.ts" 

let log = get_logger("main","bus_dca_bot.log") 

log("Initializing loop...") 


let coins = ['MATIC' , 'BNB' , 'ETH' ] 
let amount = 10 //buy $20 at a time 

let is_filled = (x : any) => (x.status && x.status == "FILLED" )

while ( true ) { 
    
    let wait_time_sec = 60*60*24 ; //1 day 
    log(`waiting ${wait_time_sec} seconds`) 
    await asnc.wait(wait_time_sec*1000)
    
    for (var coin of coins ) { 
	
	let res = await main.usd_market_buy(coin, amount) 
	
	if (! is_filled(res) ) {
	    //it failed for some reason 
	    log("FAILED TO EXECUTE => ") 
	    log(`Was trying to buy $${amount} worth of ${coin} successfully`) 
	    log(JSON.stringify(res)) 
	    Deno.exit(1) 
	    
	} else { 
	    
	    log(`Successfully bought $${amount} worth of ${coin}.`) 
	    
	} 
	
    } 
    
} 

