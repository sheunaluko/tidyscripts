import * as R from 'ramda' ;
import {get_logger} from './logger' ; 

const log = get_logger({id:"fp"}) ; 

const mapIndexed_ = R.addIndex(R.map);

/**
 * Maps a function across a list, where the function receives both index and value as arguments (i,v) 
 * 
 */
export function map_indexed(f : (idx: number, val : any) => any , x : any[]) {
    return mapIndexed_( (value:any,i:number)=> f(i,value)  as any, x as any) 
}




type dic = { [k:string] : any }


// need to implement deep copy 
export function shallow_copy(o : any) {
    if ( is_array(o) ) { return clone_array(o) }
    if ( is_map(o) ) { return clone(o) }    
    return o 
} 



/* MAPS  */

 

export function keys(a : dic) : string[] {
    return Object.keys(a)
}


/**
 * Returns the values of the dictionary as a list after cloning them 
 */
export function values_cloned(a : dic) : any[] {
    let ks = keys(a)
    let cloned = clone(a) 
    if (is_empty(ks)) {return []} else { 
	return map(ks,(k:string)=>cloned[k])
    } 
}

/**
 * Returns the values of the dictionary as a list  
 * 
 */
export function values(a : dic) : any[] {
    let ks = keys(a)
    if (is_empty(ks)) {return []} else { 
	return map(ks,(k:string)=>a[k])
    } 
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

    return clone(o) //this could be unideal -- maybe should be cloning first? 

}

export function map_items(o : {[k:string] : any}) { 
    let ks = keys(o) 
    let vs = values(o) 
    
    return zip2(ks,vs) 
} 


export var dict_to_list = map_items 

export function map_over_dic_values(o : any , f : (x :any) => any) {
    let vs = values(o) 
    let new_vs = map(vs,f) 
    return zip_map(keys(o), new_vs) 
} 

/* ARRAYS  */

export function clone_array(o : any) {
    return JSON.parse(JSON.stringify(o))
}

/**
 * Return the first element of a list 
 * 
 */
export function first<T>(arr : T[]) : T {
    return arr[0]
}

/**
 * Return the second element of a list 
 * 
 */
export function second<T>(arr : T[]) : T {
    return arr[1]
}

/**
 * Return the third element of a list 
 * 
 */
export function third<T>(arr : T[]) : T {
    return arr[2]
}

/**
 * Return the fourth element of a list 
 * 
 */
export function fourth<T>(arr : T[]) : T {
    return arr[3]
}


/**
 * Return the last element of a list 
 * 
 */
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
    if (is_empty(arr)) {return false}  ; 
    return arr.reduce( (a,b)=> (a || b) )
}

export function all_false(arr : boolean[]) : boolean {
    return !any_true(arr)
}

export function any_false(arr : boolean[]): boolean {
    return !all_true(arr)
}


export function repeat<T>(thing : T, num : number) : string[]{
    let arr = [] ; 
    for (var i of range(num) ) {
	arr.push(shallow_copy(thing))
    } 
    return arr 
    
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

export function map(arr : any[] , mapper : (x : any) => any): any[] {
    return arr.map(mapper)
}


/**
 * Creates new list by adding indexes to the input list. 
 * Specifically, takes a list of items L and returns same length list Y where Y[index] = [ index , L[index] ] 
 * 
 */
export function enumerate(x : any[]) {
    return map_indexed( (idx : number, val :any) => [idx, val] , x) 
}



/**
 * Given a list of objects, extract property 'prop' from each object 
 * to create a new list
 * @param prop The property to extract
 * @param list The list to act upon 
 */
export function map_prop(prop : string, list : any[]) { return R.map(R.prop(prop))(list) }

/**
 * Given a list of objects, extract property 'prop' from each object 
 * to create a new list, and then reduce this list with the given 
 * reducer and initial accumulator 
 * @param prop The property to extract
 * @param reducer The reducer to use 
 * @param acc The initiall acc value 
 * @param list The list to act upon 
 */
export function map_prop_reduce(prop : string, reducer : any, acc : any, list : any[]) {
    return R.reduce( reducer , acc , map_prop(prop, list) ) 
} 


/**
 *  Takes an array of X arrays with Y values each, and produces an array of Y arrays with 
 *  X values each. The first array is the concatenation of the first elemenent of each subarray.
 * The second returned array is the concatenation of the second element of each subarray. 
 * And so forth. 
 * 
 * ```
 * //create a dictionary from separate key/value arrays 
 * let keys = ['a', 'b', 'c'] ; let values = ['v1', 'v2' ,'v3] 
 * let pairs = concat_accross_index( [keys,values]  ) 
 * //  > [ ['a', 'v1'] , ['b', 'v2'] ... ] 
 * let dic  = Object.fromEntries( pairs ) 
 * ```
 */
export function concat_accross_index( arrs : any[]) {
    let result = []
    let res_len = arrs[0].length
    let arr_len = arrs.length ; 
    for (var i = 0 ; i < res_len ; i ++ ) {
	var tmp = new Array() ; 
	for ( var x = 0; x < arr_len ; x ++ ) {
	    tmp.push( arrs[x][i] )
	}
	result.push(tmp) 
    }
    return result 
} 


/**
 * Clone an object to produce an identical yet distinct reference and corresponding object
 * Uses JSON.parse(JSON.stringify(o))
 */
export function clone( o : any ) {
    return JSON.parse(JSON.stringify(o)) 
} 

/**
 * Same as Array.push however clones the array first 
 * @param arr - the array 
 * @param o - object to add 
 */
export function im_push( arr : any[], o : any ) {
    let new_a = clone(arr) as any[];
    new_a.push(o);
    return new_a ; 
} 


/**
 * Removes a value from an array if '==' is true. 
 * @param arr - the array 
 * @param o - object to remove
 */
export function im_arr_rm( arr : any[], o : any ) {
    let narr = clone(arr) ; 
    return narr.filter( (x:any)=> !(x == o ) ) 
} 



/**
 * Creates comparator function based on property value 
 * From https://stackoverflow.com/questions/1129216/sort-array-of-objects-by-string-property-value
 * Returns a comparator function for use in Array.sort 
 * @param property - The prop to sort by 
 */
export function sort_by_prop(property : string) {
    var sortOrder = 1;
    if(property[0] === "-") {
        sortOrder = -1;
        property = property.substr(1);
    }
    return function (a:any,b:any) {
        /* next line works with strings and numbers, 
         * and you may want to customize it to your needs
         */
        var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
        return result * sortOrder;
    }
}    


/**
 * Paritions an array into k groups of n items each 
 * @param arr - Array to partition 
 * @param n - size of each parition 
 */
export function partition(arr : any , n : number) {
    let len = Math.ceil(arr.length/n )
    let res = Array(len).fill(null).map( x=> ( new Array()) ) ;
    let res_index = 0 ; 
    let group = [] 
    for (var i = 0 ; i < arr.length ; i ++ ) {
	if ( (i % n) == 0 && (i !=0) ) {
	    //this is a new set
	    res_index += 1 ; 
	} 
	res[res_index].push( arr[i] ) 
    }
    return res 
}



export function enumermap(os : any[], f : (i:number,o:any)=> any) : any[] {
    let results = []
    //@ts-ignore 
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


export function zip2(a1 : any[], a2 : any[]) {
    let ret = [] 
    for (var i=0; i < a1.length;i ++) {
	ret.push( [a1[i], a2[i] ] ) 
    } 
    return ret 
} 

export var zip = zip2 

export function list_to_dict(kvs : any) {
    let result : any  = {}
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




/**
 * Creates a debouncer function 
 */
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


type fxn = (o : object) => any  ; 

export interface FunctionDictionary {
  [k:string] : fxn , 
}


/**
 * Takes an object whos keys are fields in a dictionary and values are functions and calls each function with a supplied argument and assings the result to the corresping key of the return object
 * @param fd - The "function dictionary" that maps keys to a transformer function 
 * @param arg  - The argument to the transformer function 
 * @returns ret - An object whose keys index the corresponding result of the transformer function
 * ```
 * let fd = { 'a' : ()=>"hi" , 'b' : (e)=>e.toLowerCase } 
 * let res = apply_function_dictionary_to_object(fd, "HELLO") 
 * //returns { 'a' : "hi" , 'b' : "hello" } 
 * ```
 */
export function apply_function_dictionary_to_object(fd : FunctionDictionary, o : object ) {
  let ret : any  = {} ;
  let errors : any  = [] ; 
  R.keys(fd).map( (k:any)=> {
    try { 
      ret[k] = fd[k](o) ;
    } catch (e) {
      errors.push(e) ;  
      ret[k] = null ;  
    } 
  })

  if (errors.length) {
    log(`Error while applying function to dictionary`)
    log(errors) ;
    log(ret) ; 
  }  
  return ( ret as any )   
} 


/**
 * Same as apply_function_dictionary_to_object however assumes asynchronous transformer functions. Takes an object whos keys are fields in a dictionary and values are functions and calls each function with a supplied argument and assings the result to the corresping key of the return object
 * @param fd - The "function dictionary" that maps keys to a transformer function 
 * @param arg  - The argument to the transformer function 
 * @returns ret - An object whose keys index the corresponding result of the transformer function
 * ```
 * let fd = { 'a' : ()=>"hi" , 'b' : (e)=>e.toLowerCase } 
 * let res = apply_function_dictionary_to_object(fd, "HELLO") 
 * //returns { 'a' : "hi" , 'b' : "hello" } 
 * ```
 */
export async function async_apply_function_dictionary_to_object(fd : FunctionDictionary, o : object ) {
  let ret : any  = {} ;
  let errors : any  = [] ; 
  let results = R.keys(fd).map( async (k:any)=> {
    try { 
      ret[k] = await fd[k](o) ;
    } catch (e) {
      errors.push(e) ;  
      ret[k] = null ;  
    } 
  })

  await Promise.all(results) ; 

  if (errors.length) {
    log(`Error while applying function to dictionary`)
    log(errors) ;
    log(ret) ; 
  }  
  return ( ret as any )   
} 
