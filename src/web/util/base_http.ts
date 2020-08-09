

import * as common from "../../common/util/index.ts" ; //common utilities  

import {AsyncResult, 
	Success, 
	Error} from "../../common/util/types.ts" 


export var log = common.Logger("http") 
    

export async function base_http_json(url : string) : AsyncResult<object> {

    log(`Requesting url: ${url}`)
    
    const res = await fetch(url) ;

    let status = res.status ; 
    let headers = res.headers ; 

    log(`Status: ${status}`) ; 
    log("Got headers:") ; 
    log(headers) 

    if (status != 200) {
	//there was some error --
	return Error({description: "status code failure" ,
		      status,
		      statusText : res.statusText } ) 
    }

    //otherwise we got the result
    var json; 
    try {
	json = await res.json()
	return Success(json) 
    } catch (error) {
	return Error({description: error})
    } 
    
}



interface HttpOps { 
    url : string 
} 

export async function HTTP(ops : HttpOps) { 
    
    let result = await makeRequest("GET", ops.url) 
    return result 
    
} 


interface HttpJsonOpts { 
    url : string,
} 

/* 
export async function HTTP_JSON(ops :  HttpJsonOpts)  : AsyncResult<object> { 
    
    let {url } = ops 
    
} 
*/ 



// from stackoverflow (https://stackoverflow.com/questions/30008114/how-do-i-promisify-native-xhr) 
export function makeRequest(method : string, url :string) {
    return new Promise(function (resolve, reject) {
        let xhr = new XMLHttpRequest();
        xhr.open(method, url);
        xhr.onload = function () {
            if (this.status >= 200 && this.status < 300) {
                resolve(xhr.response);
            } else {
                reject({
                    status: this.status,
                    statusText: xhr.statusText
                });
            }
        };
        xhr.onerror = function () {
            reject({
                status: this.status,
                statusText: xhr.statusText
            });
        };
        xhr.send();
    });
}






function get_url_with_params(_url : string ,params : any) { 
    let url = new URL(_url) 
    url.search = new URLSearchParams(params).toString() 
    return url 
} 

/* jfetch was designed to originally query the cloud function , but is still generic */ 
export async function  jfetch(url_base :string,url_params : any) { 
    
    let url = get_url_with_params(url_base,url_params) 
    
    log(`Using url: ${url}`) 
    
    let result = await fetch(url.toString()) 
    let jdata  = await result.json() 
    
    log("Done") 
    log("Got value: " + JSON.stringify(jdata)) 
    
    return jdata 
} 

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
    let value = await jfetch(url_base,url_params) 
} 


export async function mesh_contains(term : string) { 
    return (await mesh_lookup( {label : term, match : 'contains' } ) ) 
} 
export async function mesh_exact(term : string) { 
    return (await mesh_lookup( {label : term, match : 'exact' } ) )  
} 


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
    return (await jfetch("https://www.wikidata.org/w/api.php",ops)) 
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
