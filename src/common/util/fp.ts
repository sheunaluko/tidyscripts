

type dic = { [k:string] : any } 




/* OBJECTS  */ 
export function keys(a : dic) : string[] { 
    return Object.keys(a) 
} 

export function values(a : dic) : any[] { 
    let ks = keys(a) 
    return map(ks,(k:string)=>a[k]) 
} 

export function get(o : dic, a : string) : any {
    return o[a] 
} 

export function clone(o :dic): dic {
    let cpy = Object.assign({},o)
    return cpy 
} 
    
export function set(o : dic, a : string , val : any) : dic {
    o[a] = val 
    return o 
} 

export function set_im(o : dic, a : string , val : any) : dic {
    let cpy = clone(o)  
    cpy[a] = val 
    return cpy 
} 

export function getter(a :string): (o:dic) => any { 
    return function(o:dic) {
	return o[a]
    } 
} 

export function setter(a :string, val: any): (o:dic) => dic { 
    return function(o:dic) {
	return set(o,a,val) 
    } 
} 

export function setter_im(a :string, val: any): (o:dic) => dic { 
    return function(o:dic) {
	return set(o,a,val) 
    } 
} 


/* ARRAYS  */ 

export function all_true(arr : boolean[]) : boolean { 
    return arr.reduce( (a,b)=> (a && b) ) 
} 

export function any_true(arr : boolean[]) : boolean { 
    return arr.reduce( (a,b)=> (a || b) ) 
} 

export function all_false(arr : boolean[]) : boolean { 
    return !any_true(arr) 
} 

export function any_false(arr : boolean[]): boolean { 
    return !all_true(arr)
} 


export function repeat<T>(thing : T, num : number) : string[]{
    return (Array(num) as any).fill(thing) 
} 

export function map<I,O>(arr : I[] , mapper : (x : I) => O): O[] { 
    return arr.map(mapper) 
} 


/* Functions */




/* MATH */ 
export function add(a : number, b : number ) : number  { return a + b }  
export function subtract(a : number, b : number ): number  { return a - b }  
export function multiply(a : number, b : number )  : number  { return a * b } 
export function divide(a : number, b : number ) : number  { return a / b } 

export function adder(n : number) : (x: number)=> number { 
    return function(x: number) {
	return x + n 
    } 
} 
export function subtractor(n : number) : (x: number)=> number { 
    return function(x: number) {
	return x - m  
    } 
} 
export function divider(n : number) : (x: number)=> number { 
    return function(x: number) {
	return x / m  
    } 
} 
export function multuplier(n : number) : (x: number)=> number { 
    return function(x: number) {
	return x *  m  
    } 
} 










