
type resolver = any 
type rejector = any 
type promiseEntry = [resolver,rejector] 

let log = (m:string) => {console.log("[typedC]:: " + m )} 

export class Channel<Packet> {  
    
    value_que : any[]  ; 
    promise_que : promiseEntry[] ; 
    
    
    constructor() {  
	this.value_que = [] 
	this.promise_que = [] 
    } 
    
    read() : Promise<Packet> { 
	
	if (this.value_que.length > 0 ) {  
	    
	    let value_que = this.value_que 
	    let p = new Promise((resolve,rej)=> { 
		setTimeout( ()=> resolve(value_que.shift()  )  , 0 ) //immediately resolve 
	    }) 
	    
	    return ( p as Promise<Packet> ) 
	    
	} else { 
	    
	    //have to create a new promise 
	    let p = new Promise((resolve,reject) => { 
		this.promise_que.push([resolve,reject])  //but save the resolver 
	    }) 
	    
	    return ( p as Promise<Packet> )  //return the promise 
	} 
	
    } 
    
    write(data : Packet)  : void {
	
	if (this.promise_que.length > 0 ) { 
	    //there is already a promise awaiting this result 
	    let [resolve,reject] = (this.promise_que.shift()  as promiseEntry ) 
	    resolve(data) 
	    
	} else { 
	    //no promise is waiting -- so we will instead push to the que 
	    this.value_que.push(data) 
	} 
	
    } 
    
    clear_buffer() : void {
	//any values that have been written will be forgotten 
	this.value_que = [] 
	log("Cleared buffer") 
    } 
    
    clear_waiting(data : Packet) : void {
	//will clear the awaiting queue by sending 'data'
	//any promises that are waiting will get nulls 
	for (var i =0 ; i < this.promise_que.length ; i ++ ){ 
	    let [resolve,reject] = (this.promise_que.shift() as promiseEntry )
	    resolve(data) 
	} 
	log("Cleared awaiters") 
    } 
    
    connect(that_chan  : Channel<Packet>) : Channel<Packet> { 
	/* 
	   Connect output of one channel to another
	   and return second channel
	 */ 
	
	let this_chan = this ; 
	
	(async function(){
	    let packet = await this_chan.read() 
	    that_chan.write(packet) 
	})()
	
	return that_chan 
	
    } 
    
    
} 

