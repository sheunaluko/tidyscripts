import {params} from "./params.ts" 



export function Logger(name : string) { 
    return function(v : any ) { 
	
	if (params.suppress_log) {
	    if (!params.log_pass.includes(name)) {
		return 
	    }
	} 
	
	if (typeof v === "object" ) { 
	    console.log(`[${name}]::`)
	    console.log(v) 
	}  else { 
	    console.log(`[${name}]:: ${v}`)
	} 
    } 
    
} 

