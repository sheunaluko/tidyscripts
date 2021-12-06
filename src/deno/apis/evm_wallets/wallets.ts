
import { ethers } from "https://cdn.ethers.io/lib/ethers-5.4.6.esm.min.js" ;
import * as io from "../../io.ts"
import * as bi from "../../base_imports.ts" 

let dpw  = Deno.env.get("EVM_WALLETS_PASSW")
let wloc = (Deno.env.get("EVM_WALLETS_LOC") as string)
await io.ensure_dir(wloc)

let log = console.log 

/**
 * Generate random wallet. Uses the 'EVM_WALLETS_PASSW' env var to encrypt and stores the 
 * Wallet structure into a subdirectory of 'EVM_WALLETS_LOC'. These must be set. 
 * The latter is created if it does not exist. 
 * @param {object} metadata - Optional metadata (name, num) 
 */
async function generate_random_json_wallet(metadata :  any) {

    let { name , num }  = metadata ; 

    let wid = bi.v4.generate() //uuid
    
    log(`[${wid}] Generating wallet...`)
    let wallet = ethers.Wallet.createRandom() ;
    if (! dpw ) { log("Please set EVM_WALLETS_PASSW in the env, unable to encrypt wallet!") ; return }

    if (!wloc)  { log("Please set EVM_WALLETS_LOC in the env, unable to encrypt wallet!") ; return }


    log(`[${wid}] Encrypting wallet...`)
    let options = {
	scrypt: {
	    N: (1 << 16)
	}
    };
    //https://github.com/ethers-io/ethers.js/issues/390
    let json   = await wallet.encrypt(dpw, options) 
    let wallet_base = io.path.join(wloc,wid)

    //write the json file 
    let json_fname = io.path.join(wallet_base, "wallet.json")

    log(`[${wid}] Writing wallet json`)            
    await io.writeTextFile( { path : json_fname, data : json , append :false })

    //write a metadata file
    if ( num == undefined ) { num = -1 } 
    let _metadata = { name :( name || "unknown" ) , number : num } 
    let meta_fname = io.path.join(wallet_base, "metadata.json")
    log(`[${wid}] Writing wallet metadata`)                
    await io.writeTextFile( { path : meta_fname, data : JSON.stringify(_metadata) , append :false })
    log(`[${wid}] Done`)

    return {
	wallet , metadata : _metadata, dloc : wallet_base 
    } 
}

function wallet_subdirectories() {  return Array.from(Deno.readDirSync(wloc)).map( (x:any) => io.path.join(wloc,x.name) ) }

async function parse_wallet(dloc : string) {
    let jsonf = io.path.join(dloc, "wallet.json") ; 
    let metadata = JSON.parse( io.read_text( io.path.join(dloc, "metadata.json") ) )
    log(`Decrypting wallet ${dloc}`)
    let wallet =  await ethers.Wallet.fromEncryptedJson( io.read_text(jsonf) , dpw )
    log(`Done Decrypting wallet ${dloc}`)    
    return {
	wallet , metadata , dloc 
    } 
} 

async function load_wallets() {
    let subds = wallet_subdirectories()
    let wallets = [] 
    for (var s of subds ){
	wallets.push( parse_wallet(s)) 
    }
    return Promise.all(wallets)
}

var LOADED_WALLETS : any  = null ;

/**
 * Returns an array of all the loaded wallets 
 */
async function get_loaded_wallets() {
    if (LOADED_WALLETS) {
	return LOADED_WALLETS
    } else {
	LOADED_WALLETS = await load_wallets() 
	return LOADED_WALLETS 
    } 
}


/**
 * Generates up to N random wallets on local device and stores n as 'num' in their metadata
 * Skips ones that have already been generated 
 * @param {number} n - The number of wallets 
 */
async function generate_numbered_wallets(n : number) {
    let wallets = await get_loaded_wallets() ;
    let used_numbers = wallets.map( (w:any)=> w.metadata.number ) ;

    let new_wallets = [] 
    for (var i=0; i< n; i++) {
	if (used_numbers.indexOf(i) > -1 ) {
	    log(`Skipping number: ${i}`)
	} else {
	    let metadata = { name : null , num : i } 
	    let wallet_info = generate_random_json_wallet(metadata)
	    new_wallets.push(wallet_info) 
	} 
    }

    let resolved_new_wallets = await Promise.all(new_wallets)
    log("Finished generating new wallets.. adding to loaded.")
    resolved_new_wallets.map( (w:any) => LOADED_WALLETS.push(w) )
    log("Done")     
} 


export {
    ethers ,
    generate_random_json_wallet ,
    generate_numbered_wallets , 
    load_wallets ,
    parse_wallet,
    wallet_subdirectories,
    LOADED_WALLETS , 
} 
