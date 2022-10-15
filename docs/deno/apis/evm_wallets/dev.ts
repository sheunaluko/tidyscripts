import {aes_encrypt as aese , aes_decrypt as aesd } from "../../custom_crypto" ; 


// - - > 
let pw = Deno.env.get("EVM_CONFIG_PASSW")
let fname = Deno.env.get("EVM_CONFIG_FNAME")
// - - > 

function writeBytesToFile(fname : string, _bytes : any) { Deno.writeFileSync(fname, _bytes) }  
function readBytesFromFile(fname : string){ return  Deno.readFileSync(fname) }

function encode(s : string) { return new TextEncoder().encode(s) }
function decode(b : any) { return new TextDecoder().decode(b) } 

// - - > 
export {
    fname,
    pw,
    aese,
    aesd,
    writeBytesToFile ,
    readBytesFromFile ,
    encode,
    decode,
} 


