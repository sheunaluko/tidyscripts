

import * as hyperloop from "../hyperloop/index.ts" 
import * as common from "../../common/util/index.ts" ; //common utilities  
let fp = common.fp 
let log = common.Logger("mesh")
let debug = common.debug 
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



interface SparqlTemplateOps { 
    template : string, 
    replacers : string[][], 
    url_base : string, 
    url_params : any , 
    param_key? : string , 
}  


export async function sparql_template_fn(ops : SparqlTemplateOps) {
    let {
	template,
	replacers,
	url_base,
	url_params,
	param_key
    }  = ops 
    
    //prep query 
    var sparql = template
    for (var replacer of replacers) {
	var[ to_replace, w ] = replacer 
	sparql = sparql.replace( new RegExp(to_replace, "g") , w ) 
    } 
    
    //return sparql 
    log("sparql template fn using:")
    console.log(sparql) 
    
    //prep url params 
    url_params[param_key || 'query'] = sparql 
    
    debug.add("sparql_template_fn_template", sparql)
    
    let value = await hlm.http_json(url_base,url_params) 
    
    debug.add("sparql_template_fn_response", value)    
    
    return value 

    
} 

export async function descendants_of_tree_code(args : any) { 
    
    let {code, offset, limit, exclude} = args ; 
    
    limit = (limit  || 1000) 
    offset = (offset || 0 )  
    
    var exclude_filters = "" 
    if (exclude){ 
	exclude_filters = exclude.map( (e:string)=> {
	    return   `FILTER( !strStarts( ?treeLabel, "${e}" )) . `
	}).join("\n") + "\n" 
    } 
    
    let separator = "|"
    
    let sparql = ` 
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX meshv: <http://id.nlm.nih.gov/mesh/vocab#>
PREFIX mesh: <http://id.nlm.nih.gov/mesh/>

SELECT  ?meshID (GROUP_CONCAT(distinct ?meshLabel ; separator = "${separator}") as ?meshLabels) (GROUP_CONCAT(distinct ?treeLabel ; separator = "${separator}") AS ?treeLabels)
FROM <http://id.nlm.nih.gov/mesh>
WHERE { 
  ?meshID meshv:treeNumber ?treeNode . 
  ?meshID rdfs:label ?meshLabel .
  ?treeNode rdfs:label ?treeLabel .            
  FILTER( strStarts( ?treeLabel, "${code}" ) ) .
  ${exclude_filters}
}
GROUP BY ?meshID 

`
    log(sparql) 
    
    let url_params = { 
	query: sparql , 
	format : 'JSON' , 
	offset  
    }
    
    let url_base  =  "https://id.nlm.nih.gov/mesh/sparql" 
    
    let value = await hlm.http_json(url_base, url_params) 
    
    debug.add("sparql.desc" , value) 
    
    return value 
    
} 

/* 

SELECT  ?meshD ?treeLabel
FROM <http://id.nlm.nih.gov/mesh>
WHERE { 
  ?meshD meshv:treeNumber ?treeNode. 
  ?treeNode rdfs:label ?treeLabel .            
  FILTER( strStarts( ?treeLabel, "C" ) ) 
  FILTER( !strStarts( ?treeLabel, "C22" ) ) 
  FILTER( !strStarts( ?treeLabel, "C23" ) ) 

}
*/ 


export async function all_sparql_results(fn : any, args : any) {
    // loops to get all sparql results 
    let offset = 0 ; 
    let all_results = [] ; 
    let max_calls = 2000 ; 
    let limit = 1000; 
    
    while (true) { //meh ...  
	
	let new_args = {...args, offset,limit}
	let value = await fn(new_args) 
	
	//get the bindings ... 
	let bindings = value.result.value.results.bindings //lol 
	//add them 
	all_results.push(bindings) 
	
	// DETERMINE STOP CONDITIONS
	if (bindings.length < limit) {  
	    log(`Finished after ${all_results.length} calls`)
	    break  
	}
	
	if (--max_calls == 0) { 
	    log("Ran out of calls!") 
	    break 
	} 
	
	// IF CONTINUE 
	offset = offset + limit 
    } 
    
    all_results = fp.flat_once(all_results) 
    debug.add("sparql.all_desc", all_results) 
    return all_results
    
} 


export async function all_descendants_of_tree_code(args:any) {
    return all_sparql_results( descendants_of_tree_code, args ) 
}

export async function all_mesh_diseases() {
    //exclude C22 (Animal Diseases)
    //exclude C23 (Pathological Conditions, Signs and Symptoms) 
    return all_descendants_of_tree_code({code:"C", exclude: ["C22" , "C23"] })
} 

export async function all_mesh_conditions_signs_symptoms() { 
    return all_descendants_of_tree_code({code:"C23"})    
} 






var custom_search_template = `
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
ORDER BY ?dName
LIMIT LIMIT_VALUE
` 

var custom_search_no_limit = `
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
ORDER BY ?dName
` 

interface MCSearch { 
    search_term : string, 
    limit : number , 
    
} 

export async function mesh_custom_search(ops : MCSearch) {
    
    let { 
	search_term , 
	limit 
    } = ops ; 
    
    let temp = limit ? custom_search_template : custom_search_no_limit 
    
    let tmp = await sparql_template_fn( {
	template : temp, 
	replacers : [
	    [ "SEARCH_TERM" , search_term] ,
	    [ "LIMIT_VALUE" , (String(limit) || "blah") ] 
	    ] , 
	url_base : "https://id.nlm.nih.gov/mesh/sparql", 

	url_params : { 
	    format : 'json' ,
	    inference : true, 	    
	} 
    }) 
    
    let bindings=  tmp.result.value.results.bindings
    if (bindings.length > 0 ) {
	return bindings[0]
    } else { 
	return null
    } 
    
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



// there is a dedicated api for the mesh tree structures 


export async function children_of_tree(t : string) { 
    let url_params = {}
    let url_base = `https://meshb.nlm.nih.gov/api/tree/children/${t}`
    let value = await hlm.http_json(url_base,url_params) 
    try {
	return value.result.value
    } catch (e) { 
	return null
    }
    
} 
