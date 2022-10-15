import { ethers } from 'ethers'; // https://docs.ethers.io/v4/getting-started.html
import { v4 as uuidv4 } from 'uuid';
import * as io from "../../io"
import {get_logger}  from "../../../common/logger"
import {SmartWallet, SmartWalletOps, TxType} from "../../../common/web3/smart_wallet"  ; 

let dpw  = (process.env["EVM_WALLETS_PASSW"] as string) 
let wloc = (process.env["EVM_WALLETS_LOC"] as string)

let log = get_logger({id :'evmw'})

function check_reqs() { 
    if ( ! ( dpw && wloc ) ) {
	log("ENV vars EVM_WALLETS_(PASSW/LOC) are required to proceed. Please set these and run the process again.")
	process.exit(1) ; 
    }
    log("ENV vars EVM_WALLETS_(PASSW/LOC) are set; proceeding.") 
} 

/**
 * Generate random wallet. Uses the 'EVM_WALLETS_PASSW' env var to encrypt and stores the 
 * Wallet structure into a subdirectory of 'EVM_WALLETS_LOC'. These must be set. 
 * The latter is created if it does not exist. 
 * @param {object} metadata - Optional metadata (name, num) 
 */
async function generate_random_json_wallet(metadata :  any) {

    check_reqs() ;
    let { num }  = metadata ; 
    let wallet = ethers.Wallet.createRandom() ;
    let wid = wallet.address ;
    log(`Generating wallet...${wid}`)    
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
    await io.write_text( { path : json_fname, data : json , append :false })

    //write a metadata file
    if ( num == undefined ) { num = -1 } 
    let _metadata = { address : wid , number : num } 
    let meta_fname = io.path.join(wallet_base, "metadata.json")
    log(`[${wid}] Writing wallet metadata`)                
    await io.write_text( { path : meta_fname, data : JSON.stringify(_metadata) , append :false })
    log(`[${wid}] Done`)

    return wallet  ; 
}

function wallet_subdirectories() {
    check_reqs() ;    
    return Array.from(io.read_dir(wloc)).map( (x:any) => io.path.join(wloc,x) )
} 

async function parse_wallet(dloc : string) {
    let jsonf = io.path.join(dloc, "wallet.json") ; 
    let metadata = JSON.parse( io.read_text( io.path.join(dloc, "metadata.json") ) )
    log(`Decrypting wallet ${dloc}`)

    /* 
       create the wallet 
     */
    let wallet =  await ethers.Wallet.fromEncryptedJson( io.read_text(jsonf) , dpw )
    log(`Done Decrypting wallet ${dloc}`)    
    return {wallet,metadata} ; 
} 

type ParsedWallet = {
    wallet : ethers.Wallet;
    metadata : any 
} 

async function load_wallets() {
    check_reqs() ;    
    let subds = wallet_subdirectories()
    let wallets = [] 
    for (var s of subds ){
	wallets.push( parse_wallet(s)) 
    }
    
    LOADED_WALLETS  = await Promise.all(wallets)
    return LOADED_WALLETS 
}

var LOADED_WALLETS : ParsedWallet[]  = [] ;

/**
 * Returns an array of all the loaded wallets 
 */
async function get_loaded_wallets() {
    check_reqs() ;    
    if (LOADED_WALLETS.length > 0 ) {
	return LOADED_WALLETS
    } else {
	LOADED_WALLETS = await load_wallets() 
	return LOADED_WALLETS 
    } 
}


/**
 * Generates up to N random wallets on local device and stores n as 'num' in their metadata
 * Skips ones that have already been generated 
 * Requires that the env vars EVM_WALLETS_PASSW and EVM_WALLETS_LOC are set. 
 * @param {number} n - The number of wallets 
 */
async function generate_numbered_wallets(n : number) {
    check_reqs() ;    
    let wallets = await get_loaded_wallets() ;
    let used_numbers = wallets.map( (w:any)=> w.metadata.number ) ;

    let new_wallets : ethers.Wallet[] = [] 
    for (var i=0; i< n; i++) {
	if (used_numbers.indexOf(i) > -1 ) {
	    log(`Skipping number: ${i}`)
	} else {
	    let metadata = { num : i } ; 
	    let wallet = await generate_random_json_wallet(metadata)
	    new_wallets.push(wallet)
	} 
    }

    let resolved_new_wallets = await Promise.all(new_wallets)
    log("Finished generating new wallets.. adding to loaded.")
    resolved_new_wallets.map( (w:any) => LOADED_WALLETS.push(w) )
    log("Done")     
} 



/**
 * Searches for and parses a local wallet by its public evm address
 * @param {string} s - The address
 */
export async function get_wallet_by_address(a : string) {
    check_reqs() ;
    let w_dir = io.path.join(wloc,a)  ;
    return (await parse_wallet(w_dir)).wallet  ;
}


var wallet_cache : any = { }   ; 


/**
 * Searches for and parses a local wallet by its public evm address
 * and then creates a SmartWallet instance connected to the specified 
 * Provider
 * @param {string} addr - The address
 * @param {ethers.providers.JsonRpcProvider} p - Provider
 */
export async function get_smart_wallet_by_address(addr : string, p : ethers.providers.JsonRpcProvider , tx_type : TxType) {
    check_reqs() ;
    let w = ( wallet_cache[addr] || await get_wallet_by_address(addr) ) ;
    wallet_cache[addr]  = w ; 
    let ops = { privateKey : w.privateKey , provider : p , tx_type}  ; 
    let sw = new SmartWallet(ops) ;
    await sw.init() ;
    return sw; 
} 


export {
    ethers ,
    generate_random_json_wallet ,
    generate_numbered_wallets , 
    load_wallets ,
    get_loaded_wallets, 
    parse_wallet,
    wallet_subdirectories,
    LOADED_WALLETS , 
} 
