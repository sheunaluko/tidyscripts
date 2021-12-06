
/* 
   Config file 
   Sun Dec  5 12:40:50 CST 2021

*/

import * as io from "../../io.ts" 
import * as cutil from "../../../common/util/index.ts" 
import {aes_encrypt, aes_decrypt } from '../../custom_crypto.ts' ;

let log = cutil.Logger("config")

/* 
   Read env vars 
*/ 
var EVM_CONFIG_FNAME = Deno.env.get("EVM_CONFIG_FNAME")
var EVM_CONFIG_PASSW = Deno.env.get("EVM_CONFIG_PASSW")

/* 
   Load encrypted config file 
*/

var config : any  = {
    wallets : [] ,
}

function default_config(){
    log(`Configuration will be default=>`)
    log(config) 
}

function write_config(fname : string, o : object, pw : string) {
    log("writing config") 
    let data_raw = JSON.stringify(o);
    console.log(data_raw)
    let data_bytes = io.encode(data_raw) 
    let data_encrypted = aes_encrypt(data_bytes,pw)
    console.log(data_encrypted) 
    io.writeBytesToFile(fname, data_encrypted)
    log("Wrote encrypted config file: " + fname)
} 

if (!io.fileExistsSync(EVM_CONFIG_FNAME as string)){
    log(`Could not find the encrypted config file at loc=${EVM_CONFIG_FNAME}`)
    log(`Writing default file`)
    if (!EVM_CONFIG_PASSW) {
	log("Failed to write config due to missing AES password!. Please set EVM_CONFIG_PASSW")
	Deno.exit(0) 
    } 
    write_config(EVM_CONFIG_FNAME as string, config, EVM_CONFIG_PASSW as string)
    default_config() 
} else {
    //attempt to decrypt the file
    if (!EVM_CONFIG_PASSW) {
	log(`Config file exists but there is no provided EVM_CONFIG_PASSW for decryption`)
	default_config() 
    } else {
	//the file exists and the password is there ...
	//we read the text, decrypt it, then JSON.parse it
	config  = read_config() 
    } 
    
}

function read_config() {
    log("Attempting to read config file...") 
    let u8 = io.readBytesFromFile(EVM_CONFIG_FNAME as string)
    console.log(u8)
    let decrypted_bytes = aes_decrypt(u8, EVM_CONFIG_PASSW as string)
    console.log(decrypted_bytes)
    let config_str = io.decode(decrypted_bytes)
    console.log(config_str)
    log("Successfully loaded config") 	
    return config_str     
} 

export {
    config ,
    EVM_CONFIG_FNAME,
    EVM_CONFIG_PASSW,    
} 
