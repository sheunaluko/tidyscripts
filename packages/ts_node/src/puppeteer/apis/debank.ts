/**
 * Main module for debank api using puppeteer 
 */

import * as pup from "../index" ;
import {read_json} from "../../io" ; 
import {logger,asnc} from "tidyscripts_common" ;


const log = logger.get_logger({id: "debank"}) ; 


var chain_info_selector = "[class*=AssetsOnChain_chainInfo]" ; 
var total_value_selector = "[class*=HeaderInfo_totalAssetInner]" ;

export async function get_debank_info_for_address(addr : string) {
  let url = `https://www.debank.com/profile/${addr}` ;
  let page = await pup.new_page({}) ;
  log("Created new page") 
  await page.goto(url) ;

  if ( false ) { 
    log(`Waiting for selector: ${chain_info_selector}`)  
    await page.waitForSelector(chain_info_selector) ;
    log(`Finished waiting for selector: ${chain_info_selector}`)
  } 

  if (false) { 
    log(`Waiting for selector: ${total_value_selector}`)  
    await page.waitForSelector(total_value_selector) ;
    log(`Finished waiting for selector: ${total_value_selector}`)
  }

   if (true) { 
    log(`Waiting for network idle`);
     await page.waitForNetworkIdle() ;
    log(`Proceeding...`);     
  }



  if (false) { 
    let t = 3 ; 
    log(`Waiting ${t} seconds`);
    await asnc.wait(t * 1000) ;
    log(`Proceeding after ${t} seconds`);  
  }

  log("Finished with page load.")
  return (await extract_debank_info(page) )  
}


/**
 * Gets the portfolio given the path to an asset profile .json file 
 * To use: 
 * ```
 *  var ts = require("tidyscripts_node") ;
 *  var r = await ts.puppeteer.apis.debank.get_debank_info_for_asset_profile(process.env['ASSET_PROFILE_PATH'])  ; 
 * 
 * ```
 */
export async function get_debank_info_for_asset_profile(f : string) {

  //first read the file
  let profile = (read_json(f) as any) ;
  //get the evm addresses 
  let evm_addresses = profile.evm_addresses ;
  log("Read profile from disk...") 

  //now we start up puppeteer
  let page = await pup.new_page({}) ;
  log("Created new puppeteer page")

  // --
  log("Proceeding with portfolio extraction...") ; 
  let portfolio = await extract_portfolio(page,evm_addresses) ;
  log("Done") ;
  log(JSON.stringify(portfolio)) ;
  return portfolio  ; 
     
} 

/**
 * Main interface for determining portfolio value. 
 */
export async function extract_portfolio(page : any, evm_addressess : any) {

  var portfolio = [] ;
  
  for (var o of evm_addressess) {
    let [name,addr] = o ;
    let url = `https://www.debank.com/profile/${addr}`
    log(`Going to url ${url}`)
    await page.goto(url) ; 
    log(`Waiting for network idle`);
    let to = 6000 ;
    try {
      await page.waitForNetworkIdle({timeout : to}) ;
    } catch (error) {
      log("Network wait timeout!"); 
    } 

    
    log(`Extracting info...`) ;
    let portfolio_info = await extract_debank_info(page) ;    
    portfolio.push([name,addr,portfolio_info]) ;
    log(`Stored info:\n${JSON.stringify(portfolio_info)}`) ;
  } 

  log(`Returning entire object`) ; 
  return portfolio ;   
  
}



export async function extract_debank_info(page : any) {

  log("Attempting extraction...") 
  let result = await page.evaluate( (chain_info_selector : string)=> {

    //get total asset value 
    let total_value = Number(  (document.querySelector("[class*=totalAssetInner]") as any).innerText.split("\n")[0].replace("$","").replace(",","")); 

    //now get values on each chain 
    let parse_chain_value = function(html : any) { 
      let chain = html.children[0].innerText.replace("Assets on ","") ; 
      let value = Number(html.children[1].querySelector("span").innerText.replace(/[$,]/g, ""))
      return {chain, value} 
    } 
    
    let chains = Array.from(document.querySelectorAll(chain_info_selector))
    let value_by_chain = chains.map(parse_chain_value).filter( (x:any)=> (x.value > 0) ) ;

    //return both 
    return {total_value , value_by_chain} 
    
  } , chain_info_selector); 
  
  return result ; 
} 
