
/*
Tests the cortex api 
 */


import * as cortex from "./cortex"

/*

Note: 
export type Function = {
    description  : string,
    name : string ,
    parameters : string ,
    return_type : string,
    fn  : any  
} 
 */

const functions  =  [
    {
	description : "retrieves the current time" , 
	name        : "get_time"  ,
	parameters        : null ,
	fn          : async ()=>"time to code!", 
	return_type : "string" , 
    } ,
    {
	description : "retrieves the weather anywhere on the earth"  ,
	name        : "get_weather" ,
	parameters        : { location : "string" }  ,
	fn          : async (ops : any)=>"cold as hell!"  ,
	return_type : "string" , 	
    },
    {
	description : "retrieves the spot price of bitcoin"  ,
	name        : "get_btc_price" ,
	parameters        : null , 
	fn          : async ()=>"1 billion dollars" ,
	return_type : "string" , 	
    } ,
    
]


export async function main() {
    // init cortex 
    let model = "gpt-4o" ;
    let name  = "core-1" ;
    let ops   = { model , name, functions  } 
    let c1    = new cortex.Cortex( ops ) ;

    // preload a user message
    //c1.add_user_text_input("tell me about germany and brazil relations in 5 sentences") ;
    //c1.add_user_text_input("tell me the weather in Singapore right now") ;
    c1.add_user_text_input("tell me the time, the price of btc, and the weather in Singapore right now, all at once") ;        

    return c1 

    

}
