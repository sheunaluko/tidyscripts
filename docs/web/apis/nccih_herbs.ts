

import * as hyperloop from "../hyperloop/index" 
import * as common from "../../common/util/index" ; //common utilities  

import * as ls from "./local_storage" 

let log = common.Logger("nccih_herbs")
let hlm = hyperloop.main 
let fp = common.fp 
let debug = common.debug


var url  = "https://www.nccih.nih.gov/health/herbsataglance" 

export async function get_herbs() { 
    let html  = await hlm.http(url,{}) 
    
    let a_els = Array.from(html.querySelectorAll(".herbsul a") )
    
    let herbs = a_els.map( function(a:any){
	
	let tmp = a.href.split("/")
	let lst = (fp.last(tmp)  as string) 
	return {
	    'name' : a.innerText.trim() , 
	    'link' : url.replace("herbsataglance",lst)
	}
    })
    
    return herbs
    
} 

function p_to_array(p : any) {
    return p.innerText.split(":")[1].trim().split(",")
} 

function parse_info_el_row(div :any ) { 
    let title = div.querySelector("h2").innerText
    let points = Array.from(div.querySelectorAll("li")).map( (el:any) => el.innerText) 
    return {title,points} 
} 


export async function get_info_for_herb(url : string) {
    
    let html  = await hlm.http(url,{}) 
    let els : any[] = Array.from(html.querySelectorAll("main > .row"))
    
    let name = els[0].innerText.trim() 
    
    let ps = Array.from(els[2].querySelectorAll("p"))
    let common_names = p_to_array(ps[0]) 
    let latin_names  = p_to_array(ps[1]) 
    
    let info_el  = els[3] 
    let info_els : any[]  = Array.from(info_el.querySelectorAll(".row > .col > .row > .col > .row"))
    
    let herb_info : any  = { 
	'name' : name , 
	'Common Names' : common_names, 
	'Latin Names' : latin_names  , 
	'img_src' : html.querySelector("figure img").src 
    } 
    
    for (var i =0; i<4; i++) {
	let {title,points} = parse_info_el_row(info_els[i])
	herb_info[title] = points 
    } 
    
    return herb_info 
    
    
} 


export async function get_all_herb_data() {
    
    /* 
       should auto cache to indexedDB because I added caching to the hyperloop 
       client directly
       see below for previous implementation using my local storage api 
    */ 

    let herb_links = fp.map_get(await get_herbs(), "link") 
    // get promises for the actual data
    let promises = herb_links.map(get_info_for_herb)
    // wait for all of them 
    log("Waiting for all links..")
    let results = await window.Promise.all(promises)
    return results 
    
} 


/* 
   
   OLD 
   

export async function get_and_cache_herb_data(lsk: string) {
    
    let herb_links = fp.map_get(await get_herbs(), "link") 
    // get promises for the actual data
    let promises = herb_links.map(get_info_for_herb)
    // wait for all of them 
    log("Waiting for all links..")
    let results = await window.Promise.all(promises)
    //cache it before returning 
    ls.store_t(results, lsk)
    log("cached results: " + lsk)  
    return results 
} 

export async function get_all_herb_data() {
    
    let lsk = "nccih.herbal_data" 
    let msg = ls.get_t(lsk) 
    
    if (msg) { 
	//could potentially be old... will update it if >24 hours old 
	let {timestamp , data} = msg 
	let now = Number(new Date()) 
	let days_since_access = (now-timestamp)/1000/60/60/24 
	
	if (days_since_access <= 1 ) {
	    //return the cached copy 
	    log("Returning cached herbal data") 
	    return data 
	} else { 
	    log("Cached herbal data is old so will re-request") 
	    return get_and_cache_herb_data(lsk) 
	} 
	
    } else { 
	
	log("No cached herbal data, will request") 
	return get_and_cache_herb_data(lsk) 	
    } 
    
} 
   
   
   */ 
