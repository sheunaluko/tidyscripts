/* 
   Async utility functions 
 */

let ms = ()=> performance.now()

export enum status {
    TIMEOUT ,
} 

/**
 * Waits until the specified function "f" returns true to resume executation.
 * Checks every "rate" milliseconds to see if f is true. 
 * Timeouts after "timeout" ms and returns "True" for timeout  
 * ``` 
 * let timeout = await wait_until( f, 2000, 500 ) ;
 * if (timeout) { ... }  else {  }  ; 
 * ``` 
 */
export function wait_until(f : ()=> boolean, timeout? : number, rate? : number){
    var t_start = ms() 
    rate = rate || 200 ; 
    let p = new Promise((resolve ,reject) =>   { 
	let id = setInterval( function(){ 
	    let t_now  = ms() 
	    if (f()) { 
		//condition is met 
		resolve(false) 		
		clearInterval(id)
	    }  else { 
		let elapsed =  t_now - t_start
		if (timeout && elapsed  >= timeout ) { 
		    resolve(true) // reports an timeout
		    clearInterval(id) 
		}
	    }
	},rate) 
    }) 
    //return the promise now 
    return p
}

/**
 * Waits t milliseconds before continuing execution 
 * ``` 
 * await wait(500) ; //"sleeps" for 500ms 
 * ```
 */
export function wait(t : number) {
    return new Promise( (res,rej) => {
	setTimeout( function(){
	    res(status.TIMEOUT) 
	} , t ) 
    } ) 
} 
