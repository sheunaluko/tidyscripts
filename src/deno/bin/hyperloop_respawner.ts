let log = console.log 

/*
  Default deno script which runs when in top level directory and call ./bin/run 
*/ 

log(`Hello - ${new Date()}`) ; 
log("Initiating tidyscripts deno main function >> ") 

/*
 This file will be in the GITIGNORE 
 So that your own local script does not get pushed to the main repository (or overwritten by one there) 
 Add your machine specific code below this line  
 - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
*/




const cmd = ["deno", "run" ,"--allow-all"  , "hyperloop_init.ts" ] 

while (true) { 
    
    let p = Deno.run({
	cmd: cmd 
    });
    
    
    let _ = await p.status() ; //should return only if the process crashes for some reason 
    
    log("Respawning web server: @" + (new Date()))     
} 

