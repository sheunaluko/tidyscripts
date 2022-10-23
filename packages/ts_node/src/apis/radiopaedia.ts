/* 
    API to interact with radiopedia website 
    Dr. Sheun Aluko, October 2022 
*/

import {R, logger, asnc, fp} from 'tidyscripts_common' ;
import * as http from "../http"
const {async_apply_function_dictionary_to_object} = fp ;
import * as utils from "../utils"  

const {get_dom} = utils ; 
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
  link : string, 
  completeness : string,
  published_at : string,
  diagnostic_certainty  :string ,
  img : string,
  modalitites : string[], 
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
 * Please use get_json_cases instead. 
 * Development function for retrieving and populating the json that tidyscripts.com/api/radiopaedia/all_cases returns.
 * Retrieves data for all radiopedia cases.
 * This is meant to be run one time and then saved for use at a later point. 
 * Thus, it was written in a for loop with delay to be kind to the radiopaedia server. 
 * Do not run this function repeatedly, and if you want the json object of all cases just run get_json_cases. Then the result will be cached and will save bandwidth for the radiopaedia server.
 *  
 * @param respect - The number of milliseconds to wait between page requests to radiopaedia.com 
 */
async function  get_all_cases(respect : number) {
  log("Getting cases...")
  var cases : any  = [] ; 
  let doc = await get_cases_base() ;
  cases = cases.concat(  parse_cases(get_cases_on_page(doc) ) ) ;
  let next_page = get_next_page(doc) ; 
  log("Parsed initial page...")
  
  while ( next_page ) {
    await asnc.wait(respect) ; 
    log(`Requesting next page: ${next_page}`) ;
    doc = await get_dom(next_page) ;
    cases = cases.concat(  parse_cases(get_cases_on_page(doc) ) ) ;
    log(`Completed parsing, Number of cases now equals ${cases.length}`) ; 
    next_page = get_next_page(doc) ; 
  }

  log("Completed processing all available pages")
  return cases   
}


/**
 * Returns information for a study's stacks 
 */
export async function get_study_stacks(study : number) {
  let url = `https://radiopaedia.org/studies/${study}/stacks`;
  return await http.get_json(url) ; 
} 


/**
 * Retrives the radiopaedia case list as a json object  
 * It is about 4MB and contains 10k cases, so will take a couple seconds to load 
 */
export async function get_json_cases() {
  return await http.get_json("https://www.tidyscripts.com/api/radiopaedia/all_cases") ; 
}


/**
 * Given a CaseData object (of which an array of is returned by get_json_cases), will return the dom content of the case's page on radiopaedia. 
 */
export async function get_case_page(_case : CaseData) {
  return await get_dom(base_url+_case.link)
}


/**
 * 
 */
type CasePageExtractors = {
  [k:string] : (e:any) => any  
} 


/* 
 TODO - 
 
 [ ] optimize the pixel reading -- consider going back to Jimp lib
 

*/
type CasePage = any ;

var case_page_extractors : CasePageExtractors = {
  // --     
  'presentation' : (e:CasePage)=> e.getElementById("case-patient-presentation").querySelector("p").textContent,
  // --     
  'patient_data' : (e:CasePage)=> {
    return Object.fromEntries(
      Array.from(
	e.querySelectorAll("#case-patient-data div")
      ).map((x:any)=>x.textContent.split(":")
	.map((y:any)=>y.trim().toLowerCase())))
  },
  'study_findings' : (e:CasePage)=> e.querySelector(".study-findings").textContent ,
  // -- 
  'case_discussion' : (e:CasePage) => Array.from(e.querySelectorAll("#case-discussion p")).map((x:any)=>x.textContent).join("\n\n\n") ,
  // --
  'study_data' : async function(e:CasePage) {
    let study_id = e.querySelector("[data-study-id]").attributes["data-study-id"].value  ; 
    // --
    // -- retrieve the raw image data "stacks" 
    let study_stacks = await get_study_stacks(study_id) ;
    let stacks_data  : any = [] ;
    for (var stack of study_stacks) {
      stacks_data.push( await handle_study_stack(stack)  ) 
    }
    // --
    // -- Request the carousel data (info about each stack) 
    let carousel_html = await get_dom(`https://radiopaedia.org/studies/${study_id}/carousel?context=case&desc_length=0&fullscreen=false&lang=us`)
    let stacks_info = Array.from(carousel_html.querySelectorAll("li .thumbnail")).map( (x:any)=> ({ title : x.textContent.trim() , thumbnail : x.href})) ; 
    // -- 
    return {
      study_id ,
      study_stacks,
      stacks_data,
      stacks_info
    }
  
  }

  
}

/**
 * Parses a "CasePage" object by extracting the fields and applying a dom scraping function to each 
 */
export async function parse_case_page(page : CasePage) { 
  return await async_apply_function_dictionary_to_object(case_page_extractors, page) } 




/**
 * Parses a study stack, which is ParsedCasePage.study_data.study_stacks[index]
 * 
 */
export async function handle_study_stack( stack:  any ) {
  let {modality, images } = stack ;
  let parsed_images : any =  []  ;
  for (var image of images ) {
    parsed_images.push(  await handle_study_image(image) ) ;
    //await asnc.wait(300) ; 
  } 
  return {
    modality,
    parsed_images 
  } 
} 


/**
 * Parses an image object 
``` 
//Example input looks like:
{
  id: 59905553,
  fullscreen_filename: 'https://prod-images-static.radiopaedia.org/images/59905553/680cc234567b77cf3ab1e8cd24d21e649018e70336ccdf42abc6780d341ed001_big_gallery.jpeg',
  public_filename: 'https://prod-images-static.radiopaedia.org/images/59905553/680cc234567b77cf3ab1e8cd24d21e649018e70336ccdf42abc6780d341ed001.png',
  plane_projection: 'Axial',
  aux_modality: 'C+ arterial phase',
  position: 51,
  content_type: 'image/png',
  width: 1382,
  height: 984,
  show_feature: false,
  show_pin: false,
  show_case_key_image: false,
  show_stack_key_image: false,
  download_image_url: '/images/59905553/download?layout=false',
  crop_pending: false
}
```
 */
export async function handle_study_image(img : any) {
  return await get_radiopaedia_pixels(img.fullscreen_filename ) ; 
} 

export async function get_radiopaedia_pixels(url : string) {
  //regardless of the filetype -- should download and process the image into pixel values
  let tmp = await utils.pixels(url) as any 
  let {data, shape } =tmp ;
  
  let [ width , height , _ ] = shape  
  let pixels = fp.partition(data, 4).map( (x:any)=> x[0] ) 
  /*
  let index_pixels = function(r :number,c :number ) {
    return pixels[ width * r  + c  ] 
  }
  */ 
  let pixels_indexed = fp.partition(pixels,width ) ;  
  return { width , height , pixels_indexed}  ; 
} 


/**
 * Download all information about a radiopaedia case given its id
```
let case_data = await download_case_data('benign-intracranial-hypertension-5' } ) ; 
//Note that this function may take minutes to return, as it it was not optimized as of October 2022. 
```
 */
export async function download_case_data(id : string ) {
  let case_page = await get_dom(base_url+"/cases/" + id);
  return await parse_case_page(case_page) ;  
}

