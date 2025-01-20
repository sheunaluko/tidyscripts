/**
 * Medications API 
 * Interface to knowledge about medications 

 * @Copyright Sheun Aluko 2023 
 */

import { get_json_from_url,fp , logger } from "../index"

const log  = logger.get_logger({id: 'medications'})

export var raw_medications : any[] = [] ;
export var medications     : any[] = [] ;
export var index           : any   = null ; 


export async function get_medications() {
  await init() ;
  return medications ; 
}

export async function init() {

  if( medications.length && index ) { return } 
  
  log('Downloading medications')
  raw_medications =  await get_json_from_url("https://storage.googleapis.com/tidyscripts/medication_data.json", {}) ;
  log('Parsing medications')
  medications = fp.clone(raw_medications) ; 
  medications.map( function( med : any) {
    try { 
      med['adverse_reactions'] = parse_ar_text(med['adverse_reactions']) ;
      med['name']              = med['name'].replace("-drug-information","") ; 
      
      
    } catch {
      log(`error parsing med:`)
      console.log(med) ;
      process.exit() ; 
    }
  })
  log('Building index')  
  index = build_index(medications) ;
  log('Done') 
}


export function search_for_medication(query:string) {
    return medications.filter( function(med :any) {
	return med.name.match(query)
    })
}


export function search_for_side_effect(query : string){
  // @ts-ignore 
  let matches = R.keys(index).filter( (se:string)=> (se.match(query)  ) )
  // @ts-ignore 
  return Object.fromEntries(matches.map( (m:string) => [m , index[m] ] ) ) 
} 


function update_index(med : any , current_index : any ) {
    
  if (!med.adverse_reactions ) { return current_index }

  let x = fp.invert_dictionary(med.adverse_reactions) ;

  for ( var y of x ) {
    
    let {value,path} = y
    let frequency = path[0] ; 

    for (var v of value ) {
      if (!current_index[v]) { current_index[v] = {} }
      if (!current_index[v][frequency]) { current_index[v][frequency] = [] }
      current_index[v][frequency].push(med.name)
    }
    
  }  
  
  return current_index 
    
}

export function build_index(meds : any ) {
  let index = {} ;
  for (var med of meds) {
    index = update_index(med, index) ; 
  }
  return index ; 
}













































export function parse_subsection_1(s :any){
    // TODO
    // default case
    //log(s)
    let tmp = s.split("\n\n").filter((y:any)=>y.length>1);
    var ret :any  = {}
    tmp.map( function(x:any) {
	let tok = x.split(":")
	let sys = tok[0].trim();
	let ars  = tok.slice(1).join('').replace(/\([\s\S]*?\)/g,"").split(",").map((i:any)=>i.toLowerCase().trim())
	ret[sys] = ars
    })
    return ret     

} 
export function parse_subsection_2(s :any){
    // TODO
    // ("<1%, postmarketing, and/or case reports:") 
    return s.replace(/\([\s\S]*?\)/g,"").split(",").map((i:any)=>i.toLowerCase().trim())
} 
export function parse_ar_text(t : string) {

  if (!t) {
	//no adverse reactions provided 
	return null ; 
    }     

    let headers = [
	">10%:",
      "1% to 10%:",
	"2% to 10%:",      
	"Frequency not defined:",
	"Frequency not defined.\n\n", 
      "<1%, postmarketing, and/or case reports:",
      "<2%, postmarketing, and/or case reports:",
      "<2%:", 
	"<1%:",
      "Postmarketing:",
	"Postmarketing and/or case reports:",      
	"Case Reports:",
    ];

    let any_header = new RegExp(headers.join("|"),'g'); 
    let included_headers = t.match(any_header)
    if (!included_headers) {
	//log("No headers found") ;
	return null ; 
    } 
    let subsections = t.split(any_header)
    var dic : any = {}
    //console.log(included_headers)
    //console.log(subsections) 
     fp.map_indexed(
	function(i:number, h : string) {
	    try {
		let subsection = subsections[i+1]
		if (h.trim() == "<1%, postmarketing, and/or case reports:" ) {
		    // code for this case (separate by commas) 
		    dic[h] = parse_subsection_2(subsection)
		} else if (h.trim() == "<2%, postmarketing, and/or case reports:" ) {
		  		    // code for this case (separate by commas) 
		    dic[h] = parse_subsection_2(subsection)
		} else  {
		    // code for this case (separate by systems)
		    dic[h] = parse_subsection_1(subsection)		    
		}
	    } catch(e) {
		//console.log(included_headers)		
		//console.log(subsections)
		//console.log(h)
		//process.exit(0)
		dic[h] = false
		//log("FALSE") 
	    } 
	},
	included_headers as any[]
    )
    return dic

}