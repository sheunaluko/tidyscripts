

type dic = { [k:string] : any }




/* MAPS  */

export function clone(o :dic): dic {
    let cpy = Object.assign({},o)
    return cpy
}
 

export function keys(a : dic) : string[] {
    return Object.keys(a)
}

export function values(a : dic) : any[] {
    let ks = keys(a)
    let cloned = clone(a) 
    if (is_empty(ks)) {return []}
    return map(ks,(k:string)=>cloned[k])
}

export function merge_dictionary(a : dic, b : dic )  : dic { 
    return Object.assign(clone(a), b  ) 
} 

export function merge_dictionaries( ds : dic[] ) : dic { 
    return ds.reduce( merge_dictionary , {}) 
} 

export function get(o : dic, a : string) : any {
    return o[a]
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

export function is_empty_map(o : any) {
    return (is_map(o) && is_zero(len(keys(o))))
}


export function update_at(o : {[k:string] : any}, path : string[], fn : (x : any) => any ) {

    var ref = o ;
    for (var k = 0 ; k <path.length -1 ; k ++ ) { ref = ref[k] }

    let lk = last(path) as string
    ref[lk] = fn(ref[lk])

    return clone(o)

}

export function map_items(o : {[k:string] : any}) { 
    let ks = keys(o) 
    let vs = values(o) 
    
    return zip2(ks,vs) 
} 

export var dict_to_list = map_items 

/* ARRAYS  */

export function clone_array(o : any) {
    return JSON.parse(JSON.stringify(o))
}


export function first<T>(arr : T[]) : T {
    return arr[0]
}

export function last<T>(arr : T[]) : T {
    let len = arr.length
    return arr[len -1]
}

export function nth<T>(arr :T[],n : number) : T {
    return arr[n]
}

export function indexer(i : number) {
    //returns a function that will index at a given location 
    return function(o : any[]) {
	return nth(o,i)
    } 
} 

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

export function range(n : number,end : any = null): number[] {

    if(end) { 	
	
	let num = (end -n ) 
	var arr = Array(num).fill(0)    
	for (var i =0;i<arr.length; i++) {
	    arr[i] = i +n
	}
	return arr
	
    } else { 
	
	var arr = Array(n).fill(0)    
	for (var i =0;i<arr.length; i++) {
	    arr[i] = i
	}
	return arr


    } 
}

export function map<I,O>(arr : I[] , mapper : (x : I) => O): O[] {
    return arr.map(mapper)
}


export function enumerate(o : any[]) : [number,any][] { 
    /* 
       Like pythons enumerate, converts a list into a list of tuples where the first element 
       in the tuple is the index
     */ 
    let num = len(o) 
    return map( range(num), (i:number)=> [i,o[i]] ) 
} 


export function enumermap(os : any[], f : (i:number,o:any)=> any) : any[] {
    let results = [] 
    for ( var [i,o] of enumerate(os) ) { results.push(f(i,o)) }
    return results 
}




export function concat(a : any[], b : any[]) : any[]{ 
    return a.concat(b) 
} 

export function map_get(o : object[],k :string) : any[] {
    return map(o,getter(k))
}

export function map_set(o : object[],k :string, val : any) : any[] {
    return map(o,setter(k,val))
}

export function map_set_im(o : object[],k :string, val : any) : any[] {
    return map(o,setter_im(k,val))
}

export function is_zero(n :number ) : boolean { return (n == 0 ) }

export function len(arr : any[]) : number {
    return arr.length
}

export function is_empty_array(o :any) : boolean {
    return (is_array(o) && is_zero(len(o)))
}


export function is_empty(o : any) : boolean {
    return (is_null(o) || is_undefined(o) || is_empty_array(o) || is_empty_string(o) || is_empty_map(o) )
}

export function not_empty(o : any ) : boolean {  return !is_empty(o) }


export function filter(o : any[], fn : (a : any)=>boolean) {
    return o.filter(fn)
}

export function filter_key(os : object[], k : string, fn : (a :any)=> boolean ) : object[] {
    return filter(os , (o : object)=>fn(get(o,k)) )
}

export function filter_key_equals(os :object[], k : string, val : any) {
    return filter_key(os,k, (a:any)=>a==val )
}

export function remove_empty(o : any[]) : any[] {
    return filter(o,not_empty)
}

export function any_is_array(o : any[]) : boolean {
    return any_true(map(o,is_array))
}

export function flat_once(o : any[]) : any[] {
    let tmp = o.flat()
    return tmp
}

export function recursive_flat(o :any[]) : any[] {
    if (any_is_array(o)){
	return recursive_flat(flat_once(o))
    }else {
	return o
    }
}

export function recursive_flat_remove_empty( arr : any[]) : any [] {
    return remove_empty(recursive_flat(arr))
}

export function partition( arr : any[] , num :number ) {
    var partitions : any[] = []
    var curr : any[] = []
    for ( var i = 0; i < arr.length ; i++) {
	curr.push(arr[i])
	if ( len(curr) == num ) {
	    partitions.push(curr)
	    curr = []
	}
    }

    partitions.push(curr)

    return remove_empty(partitions)
}

export function zip2(a1 : any[], a2 : any[]) {
    let ret = [] 
    for (var i=0; i < a1.length;i ++) {
	ret.push( [a1[i], a2[i] ] ) 
    } 
    return ret 
} 

export var zip = zip2 

export function list_to_dict(kvs : any) {
    let result = [] 
    for ( var [k,v] of kvs ) {
	result[k] = v 
    } 
    return result 
} 

export function zip_map(a1 : any[], a2 :any[]) {
    return list_to_dict( zip(a1,a2) ) 
} 


/*  TYPES  */

export function is_null(o : any) : boolean {  return (o == null) }
export function is_undefined(o : any) : boolean { return ( o == undefined ) }
export function is_something(o : any) : boolean { return !(is_null(o) || is_undefined(o)) }

export function is_array(o : any ) : boolean {
    return (is_something(o) && o.constructor == Array )
}

export function is_string(o :any) : boolean{
    return (is_something(o) && o.constructor == String)
}

export function is_object(o :any) :boolean {
    return (is_something(o) &&  o.constructor == Object)
}

export function is_map(o :any) : boolean {
    return (is_something(o) &&  is_object(o) && (!is_array(o)))
}

/* Strings */


export function is_empty_string(o :any) : boolean{
    return (o == "")
}


export function substring(str : string, s : number , e :number )  :string  {
    return str.substring(s,e)
}

export function nchars(str : string , n : number) {
    return substring(str,0,n)
}

export function join(arr : string[] , ch : string) {
    let result = arr.join(ch)
    return result
}

export function joiner(ch : string)  : (s : string[])=> string {
    return function (s: string[]) {
	return join(s,ch)
    }
}

export function split(s :  string, ch : any) {
    return s.split(ch)
}

export function format(s : string, _replacers : any[]) { 
    let replacers = clone_array(_replacers) 
    let nxt = replacers.shift() 
    let ret = s 
    while ( nxt ) { 
	ret = ret.replace("{}",String(nxt))
	nxt = replacers.shift() 
    } 
    return ret  
} 




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
	return x - n
    }
}
export function divider(n : number) : (x: number)=> number {
    return function(x: number) {
	return x / n
    }
}
export function multiplier(n : number) : (x: number)=> number {
    return function(x: number) {
	return x *  n
    }
}


export function diff(a : number[]) : number[] {
    let result :number[] = []
    for (var i=1;i<a.length;i++){
	result.push(a[i]-a[i-1])
    }
    return result
}


// misc
export function equals(a : any, b :any ) : boolean {
    return ( a == b)
}





export function make_debouncer(d : number, cb : any ){

    var state :any =  {
	attempt_ref : null
    }

    return (args : any[] ) => {

	if (state.attempt_ref) {
	    clearTimeout(state.attempt_ref) //cancel any previously stored callback attempt
	}

	//and reset with a new one
	state.attempt_ref = setTimeout( function(){
	    cb(args)
	},d)

    }


}
