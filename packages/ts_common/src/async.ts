/* 
   Async utility functions 
 */

let ms = ()=> performance.now()

export enum status {
    TIMEOUT ,
} 

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
 * 
 */
export function wait(t : number) {
    return new Promise( (res,rej) => {
	setTimeout( function(){
	    res(status.TIMEOUT) 
	} , t ) 
    } ) 
} 
