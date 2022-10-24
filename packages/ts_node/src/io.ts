import  fs from 'fs' ;
import path from 'path' ; 
import extract from 'extract-zip';

import * as common from "tidyscripts_common" 

const log = console.log //common.logger.get_logger({id: "io"}) 

/**
 * Write string or buffer to disk 
 * 
 */
export function write_file(fname : string,s : (string | Buffer) ) { fs.writeFileSync(fname,s) ; } 


/**
 * Read a text file from disk 
 * 
 */
export function read_file(fname : string)  : string { return fs.readFileSync(fname , 'utf8') }

/**
 * Read a file from disk and returns a buffer
 * 
 */
export function read_buffer_from_file(fname : string)  { return fs.readFileSync(fname) }

/**
 * Blocks the runtime until N bytes are read from a readable stream 
 * 
 * @param readable - Readable stream to read from 
 * @param n - Number of bytes to read 
 */
export function read_n_bytes_from_stream( readable : any , n : number ) {
    var chunk ; 
    while (null !== (chunk = readable.read(n))) {
	return chunk 
    }
}




/**
 * Read a file from disk and returns a readable stream 
 * 
 */
export function readable_stream_from_file(fname : string)  { return fs.createReadStream(fname) }


/**
 * Read a text file from disk (same as read_file) 
 * 
 */
export function read_text(fname : string)  : string { return fs.readFileSync(fname , 'utf8') }

/**
 * Read a json file from disk and return the json object
 * 
 */
export function read_json(fname : string)  { return JSON.parse(read_file(fname)) } 


/**
 * Reads a directory and returns file names
 * 
 */
export function read_dir(fname : string)  {  return fs.readdirSync(fname) } 

/**
 * Appends file extension to fname if not already there. 
 * 
 */
export function ensure_extension(fname : string, ext : string)  {
    if (fname.match(new RegExp(`.{ext}$`))){
	return fname 
    } else {
	return `${fname}.${ext}`
    } 
} 

/**
 * Makes sure a directory exists and if not creates it. 
 */
export function ensure_dir(dir : string)  { if (!fs.existsSync(dir)){ fs.mkdirSync(dir, { recursive: true });  } } 

/**
 * Ensures parent directories exist
 */
export function ensure_parents(fname : string)  {
    let p = path.dirname(fname) ; 
    ensure_dir(p) ; 
} 

/**
 * Write a json file to disk 
 * 
 */
export function write_json(fname : string, o : any)  {
    return write_file(ensure_extension(fname,"json"), JSON.stringify(o))
} 


export type WriteFileOps = {
    path : string,
    data : string,
    append : boolean , 
}

/**
 * Write a text file to disk 
 */
export function write_text(ops : WriteFileOps)  {

    let { path : fpath, data, append } = ops ;
    ensure_dir( path.dirname(fpath) )  ;     
    return (append ? fs.appendFileSync(fpath, data) : write_file(fpath, data) ) ; 
} 


/**
 * Remove file from filesystem  
 * @param fname - file to remove 
 */
export function rm(fname : string)  {
    fs.unlinkSync(fname) ; 
} 



/**
 * Check if a file exists 
 * 
 */
export function exists(fname : string) { return fs.existsSync(fname) } 

/**
 * Get all (non-hidden) files in the directory as full subpaths 
 * 
 */
export function read_nonhidden_subfiles(dname : string) {
    return fs.readdirSync(dname).filter(
	(y:string)=> (y[0] != ".")
    ).map(
	(y:string) => path.join(dname,y)
    )
} 



/**
 * Extracts a zip file to a directory 
 * @param fname - The local filename 
 * @param target - Target directory 
 */ 
export async function unzip_to_directory(fname : string,  target : string) {
    try {
	await extract(fname, { dir: target })
	log(`unzip complete | ${fname}`)
    } catch (err) {
	// handle any errors
	log(`unzip error | ${fname}`)	
	log(err) 
    }    
} 



/**
 * Prints the contents of the file into stdout 
 */
export function cat(fp : string) {
  log(read_text(fp)) ; 
}




export {fs, path}  ; 
