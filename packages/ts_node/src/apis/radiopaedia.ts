/* 
    API to interact with radiopedia website 
    Dr. Sheun Aluko, October 2022 
*/

import {R, logger, asnc} from 'tidyscripts_common' ;
import {get_dom} from  "../utils" ;
export {get_dom} ;

let log = logger.get_logger({id:"radiopaedia"}) ; 

const base_url =  "https://radiopaedia.org";

type Extractors = {
  [k:string] : (e:any )=> any  
} 

const extractors : Extractors = {
  'title' : (e: any) => e.querySelector(".search-result-title").textContent ,
  'link' : (e: any) => e.href ,        
  'author' : (e: any) => e.querySelector(".search-result-author").textContent ,
  'completeness' : (e: any) => e.querySelector(".search-result-completeness").textContent ,
  'published_at' : (e: any) => e.querySelector(".search-result-published_at").textContent ,
  'diagnostic_certainty' : (e: any) => e.querySelector(".search-result-diagnostic-certainty").textContent ,
  'modalities' : (e : any) => Array.from(e.querySelector(".search-result-modalities").children).map( (c:any)=>c.textContent) , 
  'img' : (e:any) => e.querySelector("img").src as string, 

}

interface CaseData {
  title : string,
  author : string,
  completeness : string,
  published_at : string,
  diagnostic_certainty  :string ,
  img : string, 
} 

/**
 * Parses a radiopaedia cases into structured data 
 * @param case - Result of query ".search-result-case" 
 * @returns data -  instance of CaseData 
 */
export function parse_case(cse: any ) : CaseData {
  let ret : any  = {} ;
  let errors : any  = [] ; 
  R.keys(extractors).map( (k:any)=> {
    try { 
      ret[k] = extractors[k](cse) ;
    } catch (e) {
      errors.push(e) ;  
      ret[k] = null ;  
    } 
  })

  if (errors.length) {
    log(`Error while parsing case ${ret.title}`)
    log(errors) ;
    log(ret) ; 
  }  
  return ( ret as CaseData ) 
}

/**
 * Parses all radiopedia cases on a page
 * @param cases - 
 */
export function parse_cases(cases : any[] ) : CaseData[] {
    return cases.map(parse_case) ; 
} 

/**
 * Gets the radiopedia cases base site, and returns it as dom object 
 */
export async function get_cases_base() {
  return await get_dom("https://radiopaedia.org/cases/") ; 
} 

/**
 * Retrieves the dom nodes for the cases on a radiopaedia page, given the page dom 
 */
export function get_cases_on_page(page_dom : any ) {
    return Array.from(page_dom.querySelectorAll(".search-result-case"))
}

/**
 * Retrieves the url for the next page of cases if it exists, if not it returns false 
 */
export function get_next_page(page_dom : any ) {
  let ref = page_dom.querySelector(".next_page").href ;
  if (ref) { return `${base_url}${ref}`} else {  return false  } 
}


/**
 * Retrieves data for first set of  radiopaedia cases
 */
export async function get_first_cases() {
  let base_page = await get_cases_base() ;
  let cases = get_cases_on_page(base_page) ;
  let parsed_cases = parse_cases(cases) ;
  return {
    base_page,
    cases , 
    parsed_cases, 
  }
}


/**
 * Retrieves data for a page of cases 
 */
export async function get_cases_data(url : string) {
  let base_page = await get_dom(url) ;
  let cases = get_cases_on_page(base_page) ;
  let parsed_cases = parse_cases(cases) ;
  return {
    base_page,
    cases , 
    parsed_cases, 
  }
}




/**
 * Retrieves data for all radiopedia cases 
 * This is meant to be run one time and then saved for use at a later point 
 * Thus, it was written in a for loop with delay to be kind to the radiopaedia server 
 * Do not run this function repeatedly! 
 */
export async function  get_all_cases() {
  log("Getting cases...")
  var cases : any  = [] ; 
  let doc = await get_cases_base() ;
  cases = cases.concat(  parse_cases(get_cases_on_page(doc) ) ) ;
  let next_page = get_next_page(doc) ; 
  log("Parsed initial page...")
  
  while ( next_page ) {
    await asnc.wait(1000) ; 
    log(`Requesting next page: ${next_page}`) ;
    doc = await get_dom(next_page) ;
    cases = cases.concat(  parse_cases(get_cases_on_page(doc) ) ) ;
    log(`Completed parsing, Number of cases now equals ${cases.length}`) ; 
    next_page = get_next_page(doc) ; 
  }

  log("Completed processing all available pages")

  return cases   
}
