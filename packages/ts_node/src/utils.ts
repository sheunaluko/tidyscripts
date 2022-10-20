import * as http from "./http" 
import {JSDOM} from 'jsdom' 

export function log() {
    console.log("!") 
} 

/**
 * Retrives the html from a url using fetch and converts it into a DOM object using JSDOM
 */
export async function get_dom(url : string) {
  let resp = await fetch(url);
  let html = await resp.text();
  let dom  = new JSDOM(html) ;
  return dom.window.document ; 
}
