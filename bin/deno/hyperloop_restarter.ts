
import { 
	 base, 

       }  from "../../src/deno/index.ts" 


let log = console.log 

/* 
  Directory checks 
 */

let tidy_dir = (Deno.env.get('TIDYSCRIPTS_DIR')  as string) 
let hl_dir = (Deno.env.get('HYPERLOOP_DIR')  as string) 

if ( tidy_dir && hl_dir ) {} else { 
    log("Must have env vars set: TIDYSCRIPTS_DIR, HYPERLOOP_DIR") 
    Deno.exit(1)
}


/*
  Launch the hyperloop server as a subprocess and restart it if it crashes 
*/ 

log(`Hello - ${new Date()}`) ; 
log("Initiating hyperloop server restarter >> ") 


let hyperloop_init_path =  base.path.join(tidy_dir,"bin/deno/hyperloop_init.ts")

//note the granular permissions :) 
const cmd = ["deno",
	     "run" ,
	     "--allow-env",
	     "--allow-net",
	     "--allow-read",	     
	     "--allow-write=${HYPERLOOP_DIR}/public_fs",
	      hyperloop_init_path]

while (true) { 
    
    let p = Deno.run({
	cmd: cmd 
    });
    
    let _ = await p.status() ; //should return only if the process crashes for some reason 
    
    log("Respawning web server: @" + (new Date()))     
} 

