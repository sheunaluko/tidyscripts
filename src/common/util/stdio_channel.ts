import type  {
    IOProcess , 
    IOArgs, 
    IOPacket,
    IOData, 
    IOMetadata, 
    IODataPacket, 
}  from "./stdio.ts" 

import { 
    IOPacketType, EOF  
} from "./stdio.ts" 


type resolver = any 
type rejector = any 
type promiseEntry = [resolver,rejector] 

let log = (m:string) => {console.log("[typedC]:: " + m )} 

export class IOChannel {  
    
    value_que : any[]  ; 
    promise_que : promiseEntry[] ; 
    
    
    constructor() {  
	this.value_que = [] 
	this.promise_que = [] 
    } 
    
    read() : Promise<IOPacket> { 
	
	if (this.value_que.length > 0 ) {  
	    
	    let value_que = this.value_que 
	    let p = new Promise((resolve,rej)=> { 
		setTimeout( ()=> resolve(value_que.shift()  )  , 0 ) //immediately resolve 
	    }) 
	    
	    return ( p as Promise<IOPacket> ) 
	    
	} else { 
	    
	    //have to create a new promise 
	    let p = new Promise((resolve,reject) => { 
		this.promise_que.push([resolve,reject])  //but save the resolver 
	    }) 
	    
	    return ( p as Promise<IOPacket> )  //return the promise 
	} 
	
    } 
    
    write(data : IOPacket)  : void {
	
	if (this.promise_que.length > 0 ) { 
	    //there is already a promise awaiting this result 
	    let [resolve,reject] = (this.promise_que.shift()  as promiseEntry ) 
	    resolve(data) 
	    
	} else { 
	    //no promise is waiting -- so we will instead push to the que 
	    this.value_que.push(data) 
	} 
	
    } 
    
    write_data(data : IOData ) : void { 
	
	let packet : IOPacket   = { 
	    type : IOPacketType.Data , 
	    data  : data , 
	    
	} 
	
	this.write(packet) 
	
    } 
    
    write_EOF() : void { 
	
	this.write(EOF as IOPacket ) 
	
    }     
    
    clear_buffer() : void {
	//any values that have been written will be forgotten 
	this.value_que = [] 
	log("Cleared buffer") 
    } 
    
    clear_waiting(data : IOPacket) : void {
	//will clear the awaiting queue by sending 'data'
	//any promises that are waiting will get nulls 
	for (var i =0 ; i < this.promise_que.length ; i ++ ){ 
	    let [resolve,reject] = (this.promise_que.shift() as promiseEntry )
	    resolve(data) 
	} 
	log("Cleared awaiters") 
    } 
    
    connect(that_chan  : IOChannel) : IOChannel { 
	/* 
	   Connect output of one channel to another
	   and return second channel
	 */ 
	
	let this_chan = this ; 
	
	(async function() { 
	    while (true) {
		let p = await this_chan.read() 
		if (p.type == IOPacketType.EOF) {
		    that_chan.write(p) // have to propagate prior to disconnect 
		    break 
		} else { 
		    that_chan.write(p) 
		} 
	    } 
	})()
	
	return that_chan 
	
    } 
    
    
} 

