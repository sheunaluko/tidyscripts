

type resolver = any 
type rejector = any 
type promiseEntry = [resolver,rejector] 

let log = console.log 

export class Channel {  
    
    
    value_que : any[]  ; 
    promise_que : promiseEntry[] ; 
    
    constructor() {  
	
	this.value_que = [] 
	this.promise_que = [] 
	
    } 
    
    
    read() : Promise<any> { 
	
	if (this.value_que.length > 0 ) {  
	    
	    let value_que = this.value_que 
	    let p = new Promise((resolve,rej)=> { 
		setTimeout( ()=> resolve(value_que.shift())  , 0 ) //immediately resolve 
	    }) 
	    
	    return p 
	    
	} else { 
	    
	    //have to create a new promise 
	    let p = new Promise((resolve,reject) => { 
		this.promise_que.push([resolve,reject])  //but save the resolver 
	    }) 
	    
	    return p  //return the promise 
	} 
	
    } 
    
    write(data : any)  : void {
	
	if (this.promise_que.length > 0 ) { 
	    //there is already a promise awaiting this result 
	    let [resolve,reject] = (this.promise_que.shift()  as promiseEntry ) 
	    resolve(data) 
	    
	} else { 
	    //no promise is waiting -- so we will instead push to the que 
	    this.value_que.push(data) 
	} 
	
    } 
    
    flush() : void {
	//will clear the channel queue by sending nulls 
	
	//any values that have been written will be forgotten 
	this.value_que = [] 
	
	//any promises that are waiting will get nulls 
	for (var i =0 ; i < this.promise_que.length ; i ++ ){ 
	    let [resolve,reject] = (this.promise_que.shift() as promiseEntry )
	    resolve(null) 
	} 
	
	console.log("Flushed channel") 
    } 
    
    async log_data() { 
	
	log("Chan read loop initiated") 
	
	while (true ) {
	    let val = await this.read() 
	    log("Got value:") 
	    log(val) 
	} 
    } 
    
    
    
} 

