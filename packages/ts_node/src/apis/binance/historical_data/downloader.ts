
import * as common from "tidyscripts_common" 
import { io, puppeteer , cryptography, http } from  "../../../index"

var {R} = common ; 



const log = common.logger.get_logger({id: "binancedld"}) ;

const dl_selector = "tr:not(:first-child) td:first-child a"; 

export async function extract_binance_market_data_links(page  : any) { 
    let tmp  =  await page.evaluate( (dl_selector : string)=>{ return Array.from(document.querySelectorAll(dl_selector) ).map((x:any)=> x.href)} , dl_selector)
    let tmp2 = R.splitEvery(2, tmp) 
    let result = tmp2.map(y=> ({checksum_link : y[0], zip_link : y[1]})) 
    return result
} 


export function link_to_fpath(link : string) {
    return link.split("vision/data/")[1] ; 
}


/**
 * Main function for downloading a link object. 
 * Link object consists of {checksum_link, zip_link} 
 * It will download the data to subdirectory of 'dir' 
 */
export async function handle_link_object( dir  : string, lo : any ) {
    
    let { checksum_link , zip_link } = lo ;
    let cpath = io.path.join( dir, link_to_fpath(checksum_link) )
    let zpath = io.path.join( dir, link_to_fpath(zip_link) )
    //download both links
    if (io.exists(cpath) && io.exists(zpath) ) {
	log(`ALREADY EXISTS: ${cpath}`)
	log(`ALREADY EXISTS: ${zpath}`)
	
    } else { 
	let result = await Promise.all( [
	    http.download_url_to_file(checksum_link, cpath) ,
	    http.download_url_to_file(zip_link,      zpath) 
	])
	log(`Downloaded ${cpath}`)
	log(`Downloaded ${zpath}`)
    }
    
    log("Validating checksum...")
    let ccs = cryptography.file_checksum(zpath, 'sha256').trim() ;
    let rcs = io.read_text(cpath).split(/\s/)[0].trim() ;
    if ( ccs == rcs ) {
	log("Checksums match!")  ; 
    } else {
	log("ERROR: checksums do not match!")
	log(`computed=${ccs}`)
	log(`realchec=${rcs}`)

	log("Deleting files...")
	io.rm(cpath) ;
	io.rm(zpath) ;
	log("Trying again...")
	await handle_link_object(dir, lo) ; 
    }

    //now that checksums match we can unzip the files
    log(`Unzipping ${zpath}`)
    await io.unzip_to_directory(zpath,io.path.dirname(zpath))
    log(`Done`)
    
} 

export var test_page = "https://data.binance.vision/?prefix=data/spot/monthly/klines/ETHUSDT/1h/" ;


export async function get_links_for_page(p : string) {
    let page = await puppeteer.new_page({});
    log("created new new page")
    await Promise.all([
	page.goto(p), 
	page.waitForSelector(dl_selector) 
    ])
    log("data available") 
    
    // -- 
    let data = await extract_binance_market_data_links(page) ;
    log("data retrieved") 
    return data
} 


export async function download_data_for_page(dir : string, p : string) {
    log(`I N I T - ${p}`)    
    let d = await get_links_for_page(p)  ;
    for ( var lo of d ) {
	await handle_link_object(dir,lo) 
    }
    log(`D O N E - ${p}`)
} 


/**
 * Main entry point for downloading historical data. 
 * Just enter the top level directory to download data to and the symbol you want to download 
 * and this will download the hourly kline data for that symbol. 
 * This includes downloading zip files, checking the checksums, and extracting the csvs. 
 * The data will be in a nested location within the suppplied top level directory. 
 * For example, in the node command line just run this... 
 * ```
 * let _ = await ts.apis.binance.historical_data.downloader.download_hourly_kline_data_for_symbol("/path/to/data/crypto/historical", "ETHBTC")
 * ```
 */
export async function download_hourly_kline_data_for_symbol(dir : string, symbol : string) {

    let page = `https://data.binance.vision/?prefix=data/spot/monthly/klines/${symbol}/1h/`
    await download_data_for_page(dir, page) ;
} 
