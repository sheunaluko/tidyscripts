

type dic = { [k:string] : any }




/* MAPS  */
export function keys(a : dic) : string[] {
    return Object.keys(a)
}

export function values(a : dic) : any[] {
    let ks = keys(a)
    if (is_empty(ks)) {return []}
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

export function range(n : number): number[] {
    var arr = Array(n).fill(0)
    for (var i =0;i<arr.length; i++) {
	arr[i] = i
    }
    return arr
}

export function map<I,O>(arr : I[] , mapper : (x : I) => O): O[] {
    return arr.map(mapper)
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
