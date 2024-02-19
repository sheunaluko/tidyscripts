
/* 
 * DSP 
 * Utilities for working with time and frequency domain signals :) 
 * 
 */


declare var window : any ;

type NumericArray = number[ ] | Float32Array | Uint8Array   ; 

export function length(x : NumericArray) : number { return x.length  } 

export function power(x : NumericArray) : number { 
    let pow = 0 
    for (var i=0;i <x.length; i++) {
	pow += window.Math.pow(x[i],2)
    } 
    return Math.pow(pow, 0.5) 
}

export function sum(x : NumericArray) : number {
    let sum = 0 ;
    for (var i=0;i <x.length; i++) {
	sum += x[i] ; 
    } 
    return sum 
} 

export function abs(x : NumericArray) {
    let _abs = [] ;
    for (var i=0;i <x.length; i++) {
	_abs[i] = Math.abs(x[i])
    } 
    return _abs
} 


export function mean(x : NumericArray)  : number {  return ( sum(x)/length(x) ) }

/*
 * Returns the mean of the absolute value of the samples in the array 
 */
export function mean_abs(x : NumericArray)  : number {  return mean(abs(x as number[])) } 

export function min_max_mean(x : NumericArray) {
    let max = Math.max.apply(null,x as number[]);
    let min = Math.min.apply(null,x as number[] );
    let mn  = mean(x) 
    return {max,min , mean: mn} 
} 

/*
 * Flatten an array of Float32Arrays into one Float32Array
 */
export function flat_float32_array(chunks : Float32Array[]) {
    //https://stackoverflow.com/questions/66243104/how-to-concat-multiple-float32arrays-into-one-float32array
    //get the total number of frames on the new float32array
    const nFrames = chunks.reduce((acc, elem) => acc + elem.length, 0)
    //create a new float32 with the correct number of frames
    const result = new Float32Array(nFrames);
    //insert each chunk into the new float32array 
    let currentFrame =0
    chunks.forEach((chunk)=> {
        result.set(chunk, currentFrame)
        currentFrame += chunk.length;
    });
    return result;
}
