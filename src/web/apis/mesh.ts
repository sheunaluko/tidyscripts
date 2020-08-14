

import * as hyperloop from "../hyperloop/index.ts" 
import * as common from "../../common/util/index.ts" ; //common utilities  
let fp = common.fp 
let log = common.Logger("mesh")
let hlm = hyperloop.main 



interface MeshLookupOps { 
    label : string, 
    match : string, 
    limit? : number 
} 
    
export async function mesh_lookup(ops : MeshLookupOps) { 
    let {label,match,limit} = ops 
    log("mesh lookup: " + label) 
    let url_params = { 'label' : label ,
		       'match' : (match || "contains")   , 
		       'limit' : (limit || 10 )  }  
    let url_base = "https://id.nlm.nih.gov/mesh/lookup/descriptor" 
    let value = await hlm.http_json(url_base,url_params) 
    return value 
} 


export async function mesh_contains(term : string) { 
    return (await mesh_lookup( {label : term, match : 'contains' } ) ) 
} 
export async function mesh_exact(term : string) { 
    return (await mesh_lookup( {label : term, match : 'exact' } ) )  
} 



// -- look up allowable qualifiers for a given entity 
export async function mesh_qualifiers(id : string ) {
    let url_params = { 
	descriptor: id 
    }
    let url_base = "https://id.nlm.nih.gov/mesh/lookup/qualifiers" 
    let value = await hlm.http_json(url_base,url_params) 
    return value 
} 



let test = `
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX meshv: <http://id.nlm.nih.gov/mesh/vocab#>
PREFIX mesh: <http://id.nlm.nih.gov/mesh/>
PREFIX mesh2020: <http://id.nlm.nih.gov/mesh/2020/>
PREFIX mesh2019: <http://id.nlm.nih.gov/mesh/2019/>
PREFIX mesh2018: <http://id.nlm.nih.gov/mesh/2018/>

SELECT DISTINCT ?d ?dName ?treeNum
FROM <http://id.nlm.nih.gov/mesh>
WHERE {
  ?d a meshv:Descriptor .
  ?d meshv:treeNumber ?treeNum . 
  ?d meshv:concept ?c .
  ?d rdfs:label ?dName .
  ?c rdfs:label ?cName
  FILTER(REGEX(?dName,'SEARCH_TERM','i') || REGEX(?cName,'SEARCH_TERM','i')) 
} 
ORDER BY ?d` 


export async function mesh_search2(s : string) { 
    
    let sparql = test.replace(new RegExp("SEARCH_TERM","ig"), s)
    
    //return sparql 
    
    let url_params = { 
	query: sparql , 
	inference : true, 
	format : 'JSON' , 
    }
    let url_base = "https://id.nlm.nih.gov/mesh/sparql" 
    let value = await hlm.http_json(url_base,url_params) 
    return value 
} 



let ancestors_template = `
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX meshv: <http://id.nlm.nih.gov/mesh/vocab#>
PREFIX mesh: <http://id.nlm.nih.gov/mesh/>
PREFIX mesh2015: <http://id.nlm.nih.gov/mesh/2015/>
PREFIX mesh2016: <http://id.nlm.nih.gov/mesh/2016/>
PREFIX mesh2017: <http://id.nlm.nih.gov/mesh/2017/>

SELECT ?treeNum ?ancestorTreeNum ?ancestor ?alabel
FROM <http://id.nlm.nih.gov/mesh>

WHERE {
   mesh:DESCRIPTOR_ID meshv:treeNumber ?treeNum .
   ?treeNum meshv:parentTreeNumber+ ?ancestorTreeNum .
   ?ancestor meshv:treeNumber ?ancestorTreeNum .
   ?ancestor rdfs:label ?alabel
}

ORDER BY ?treeNum ?ancestorTreeNum` 


export async function mesh_ancestors(did : string) {
    
    let sparql = ancestors_template.replace("DESCRIPTOR_ID", did) 
    
     let url_params = { 
	query: sparql , 
	inference : true, 
	format : 'JSON' , 
    }
    let url_base = "https://id.nlm.nih.gov/mesh/sparql" 
    let value = await hlm.http_json(url_base,url_params) 
    
    let arr = value.result.value.results.bindings
    
    let treeNums  = new Set(arr.map((x:any)=>get_tree_num(x.treeNum.value))) 
    
    let to_return : any = {} 
    for (var a of arr ) {
	
	let treeNum = get_tree_num(a.treeNum.value)
	let ancestorNum = get_tree_num(a.ancestorTreeNum.value)
	let depth = ancestorNum.split(".").length 
	
	if (!to_return[treeNum] ) {
	    to_return[treeNum] = {} 	    
	} 
	
	to_return[treeNum][depth] = { 
	    label : a.alabel , 
	    treeNum : ancestorNum ,
	} 

	
    } 
    
    var results : any  =  [] 
    for (var treeNum  of treeNums) {
	let tmp = [] 
	let max_depth = Number(fp.last(fp.keys(to_return[(treeNum as string)])))
	for (var i =1; i<=max_depth ; i ++ ) {
	    tmp.push(to_return[(treeNum as string)][i].label.value)
	} 
	results.push( {  treeNum , path : tmp } ) 
    } 
    
    
    
    return results 
    
    
    //return value 
    
} 




export function get_tree_num(url : string) : string {
    return String(fp.last(url.split("/")))
} 

export function get_descriptor_id(url : string) {
    return fp.last(url.split("/"))
} 
