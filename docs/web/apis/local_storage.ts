import * as fp from "../../common/util/fp" 

/*
  interface to local storge 
  abstraction 
*/ 

declare var window : any ; 
let LS = window.localStorage 

// - 
var storage_header = "tidyscripts" 
export function set_storage_header(h:string){storage_header = h} 
export function dot_join(a : string[]) { return a.join(".") }  
export function full_name(n : string) { return dot_join([storage_header, n]) } 

//storing and getting from LS 
export function store(o : any, n : string ) { LS[full_name(n)] = JSON.stringify(o) }  
export function get(n: string) { 
    let data = LS[full_name(n)]
    if (data) {  return JSON.parse(data) } else { return null } 
}  
export function get_keys() {  return Object.keys(LS)  }  
export function get_header(h : string) { 
    //returns all local storage objects which match under a header
    let obs = get_keys() 
    return fp.filter(obs, (s:string)=> s.startsWith(h) )  
} 


//higher abstraction storing (with timestamp), that will allow for caching on top 
interface t_storage_obj { 
    timestamp : number , //epoch ms 
    data : any, //the data that was stored 
} 

export function store_t(o : any, n : string) { 
    let msg : t_storage_obj = { 
	timestamp : Number(new Date()) , 
	data : o 
    } 
    store(msg,n) 
} 

export function get_t(n : string) {
    return get(n) 
} 
