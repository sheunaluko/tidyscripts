
import * as base from "./base_imports.ts"
import {Date} from "../common/util/index.ts" 



export function fileExistsSync(fname : string)  : boolean { 
  try {
    Deno.statSync(fname);
      // successful, file or directory must exist
      return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
	// file or directory does not exist
	return false;
    } else {
	// unexpected error, maybe permissions, pass it along
	throw error;
    }
  }
}

export async function fileExists(fname : string)  : Promise<boolean> { 
  try {
      await Deno.statSync(fname);
      // successful, file or directory must exist
      return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
	// file or directory does not exist
	return false;
    } else {
	// unexpected error, maybe permissions, pass it along
	throw error;
    }
  }
}

export function appendTextFileSync(path: string, data: string) {  
    
    const encoder = new TextEncoder();
    const _data = encoder.encode(data);
    Deno.writeFileSync(path, _data, {append: true});  // add data to the end of the file
} 


export async function writeTextFile(ops : any) {
    let {path, data, append} = ops ; 
    
    var log = console.log
    
    log(`Request to write: ${path},${data},${append}`)
    
    let pdir = base.path.dirname(path) 
    
    await Deno.mkdir(pdir, { recursive: true }); 
    
    log(`Ensured dir: ${pdir}`)
    
    await Deno.writeFile(path, new TextEncoder().encode(data), {append} );
    
    log(`Done`) 
    
} 


export async function appendTextFile(path: string, data: string) {  
    const encoder = new TextEncoder();
    const _data = encoder.encode(data);
    await Deno.writeFile(path, _data, {append: true});  // add data to the end of the file
} 

export function readJSONFileSync(path: string) {  
    let txt = Deno.readTextFileSync(path) 
    return JSON.parse(txt.replace(/\s+/g,"")) 
} 

export function readJSONFile(path: string) {  
    let txt = Deno.readTextFileSync(path) 
    return JSON.parse(txt.replace(/\s+/g,"")) 
} 


export function get_logger(name : string, file? : string) {
    return function(m : any){ 
	var to_print = `${Date.iso_now()}|${name} => ${JSON.stringify(m)}` 
	if (file) {
	    appendTextFileSync(file, to_print + "\n") 
	} else { 
	    console.log(to_print) 
	} 
    } 
} 
    

// - 
let path = base.path 
export {path} 
    
