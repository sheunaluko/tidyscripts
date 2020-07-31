



export function Logger(name : string, file : string) { 
    return function(v : any ) { 
	if (typeof v === "object" ) { 
	    console.log(`[${name}]::`)
	    console.log(v) 
	}  else { 
	    console.log(`[${name}]:: ${v}`)
	} 
    } 
    
} 

