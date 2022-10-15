import * as R from 'ramda' ; 

const mapIndexed_ = R.addIndex(R.map);

/**
 * Maps a function across a list, where the function receives both index and value as arguments (i,v) 
 * 
 */
export function map_indexed(f : (idx: number, val : any) => any , x : any[]) {
    return mapIndexed_( (value:any,i:number)=> f(i,value)  as any, x as any) 
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
 * Return the last element of a list 
 * 
 */
export function last(x : any[]) { return x.slice(-1)[0] }

/**
 * Return the first element of a list 
 * 
 */
export function first(x : any[]) { return x[0] } 


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
