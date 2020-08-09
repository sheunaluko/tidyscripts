

import * as hyperloop from "../hyperloop/index.ts" 
import * as common from "../../common/util/index.ts" ; //common utilities  
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
		       'limit' : (limit || 10  )  }  
    let url_base = "https://id.nlm.nih.gov/mesh/lookup/term" 
    let value = await hlm.http_json(url_base,url_params) 
} 


export async function mesh_contains(term : string) { 
    return (await mesh_lookup( {label : term, match : 'contains' } ) ) 
} 
export async function mesh_exact(term : string) { 
    return (await mesh_lookup( {label : term, match : 'exact' } ) )  
} 

