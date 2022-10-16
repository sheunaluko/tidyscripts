
/* 
   DSP 
 */


declare var window : any ; 

export function power(x : number[]) : number{ 
    let pow = 0 
    for (var i=0;i <x.length; i++) {
	pow += window.Math.pow(x[i],2)
    } 
    return pow
} 
