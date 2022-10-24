import * as http from "./http"
import * as io from "./io" 
import {JSDOM} from 'jsdom'
import get_pixels from "get-pixels" ;
import {logger,fp} from "tidyscripts_common" ;
import * as htmlparser2 from "htmlparser2" ; 
import * as domutils from "domutils" ; 

export { 
  domutils 
}

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



/**
 * Parses an xml document 
 * @param fpath - Path to the xml file on disk 
 */
export function parse_xml(fpath  : string) { 
  let txt = io.read_text(fpath) ; 
  const dom = htmlparser2.parseDocument(txt) ;
  return dom 
}


/**
 * Retrieves sub nodes of htmlparser2 dom object by child name 
 * @param fpath - Path to the xml file on disk 
 */
export function dom_path_by_child_name(path : string[], dom : any) {
  let res : any = dom ; 
  for (var i = 0; i < path.length ; i ++) { 
    res = res.children ; 
    let next_name = path[i] ; 
    res = domutils.findOne( (c:any)=> (c.name == next_name) , res  ) as any  ;    
  }
  return res  
}

/**
 * Returns the child names of a given htmlparser2 dom element 
 */
export function dom_child_names(dom : any){
  return dom.children.map((x:any)=>x.name).filter(fp.is_something) 
}

/**
 * Returns the children a given htmlparser2 dom element, omitting any text elements 
 */
 export function dom_children(dom : any){
  return dom.children.filter((x:any)=>x.type != "text" ) ; 
}


/**
 * Returns true if the dom element has atleast one child element with a defined name attribute
 */
export function has_one_named_child(dom: any){
  return domutils.findOne( (c:any)=>c.name , dom.children ) 
}
/**
 * Returns either the children names if there are children with names, otherwise it will return the data value of the first child
 */
 export function dom_sub_nodes(dom : any){
   if (has_one_named_child(dom)) { 
    return dom.children.map((x:any)=>x.name).filter(fp.is_something) 
   } else { 
     return dom.children[0].data 
   }
}

/**
 * Accessing the provied path into the dom object 
 * Returns either the children names if there are children with names, otherwise it will return the data value of the first child
 */
 export function dom_path_sub_nodes(path : string[] ,dom : any){
  return dom_sub_nodes(dom_path_by_child_name(path, dom) ) ; 
}