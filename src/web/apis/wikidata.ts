
import * as hyperloop from "../hyperloop/index.ts" 
import * as common from "../../common/util/index.ts" ; //common utilities  
let log = common.Logger("wikidata")
let hlm = hyperloop.main 


interface WikiDataOps { 
    action : string ,
    sites : string, 
    titles : string, 
    props : string, 
    languages : string,
    format : string, 
} 

export async function qwikidata(ops : WikiDataOps ) { 
    ops.format = 'json' 
    return (await hlm.http_json("https://www.wikidata.org/w/api.php",ops)) 
} 

interface WikiEntitySearchOps { 
    titles : string, 
    props : string , 
} 

export async function WikiEntities(ops : WikiEntitySearchOps) { 
    
    return qwikidata({ 
	action : "wbgetentities", 
	sites  : "enwiki" , 
	titles : ops.titles , 
	props : ops.props , 
	languages : 'en',
	format : 'json', 
    }) 
} 
