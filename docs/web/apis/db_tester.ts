

/* 
   @Copyright Sheun Aluko 
   Test suite for the db module 
   
   Thu Dec 31 13:16:13 CST 2020
 */


import {GET_DB , 
	STOP_CACHE_CHECK, 
	START_CACHE_CHECK,
	TTL, 
	log, 
       } from "./db" 


const test_db  = GET_DB("tester") 

export function do_test() { 
    
    START_CACHE_CHECK(1000) 
    
    let ms_delays : number[] = [2000,4100, 6100, 8100, 11000]  
    
    for (var delay of ms_delays ) {
	let x = 'delay_' + String(delay )
	test_db.set_with_ttl( {
	    ttl_ms : delay, 
	    id : x , 
	    value : x, 
	})
    } 
    
    setTimeout( async function() {
	STOP_CACHE_CHECK() 
	
	let ttl_num = (await TTL.keys()).length
	let test_num = (await test_db.keys()).length 
	
	log(`Finished with test! There are ${test_num} and ${ttl_num} entries in test and ttl dbs respectively...`)

    } , 14000 ) 
    
    
    
} 
