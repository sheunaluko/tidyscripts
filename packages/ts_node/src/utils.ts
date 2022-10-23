import * as http from "./http" 
import {JSDOM} from 'jsdom'
import get_pixels from "get-pixels" ;
import {logger,fp} from "tidyscripts_common" ; 

const log = logger.get_logger({id : "utils"}) ; 

/**
 * Retrives the html from a url using fetch and converts it into a DOM object using JSDOM
 */
export async function get_dom(url : string) {
  let resp = await fetch(url);
  let html = await resp.text();
  let dom  = new JSDOM(html) ;
  return dom.window.document ; 
}

/**
 * Retrieves pixel values from a remote image source 
 * Wrapper around the get_pixels lib 
 */
export async function pixels(url : string) {
  // - 
  var p = new Promise( (res :any, rej :any) => {
    // - 
    get_pixels(url, function(err, pixels) {
      if(err) {
	rej("Bad image path")
	return
      }
      log(`got pixels from ${url}`)
      res(pixels) 
    })
    // - 
  })

  return p 
} 

