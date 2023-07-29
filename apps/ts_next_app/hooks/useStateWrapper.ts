'use client' ; 

import React from 'react';
import * as tsw from 'tidyscripts_web'

const fp = tsw.common.fp; 


export default function useStateWrapper(args: any) {

    var wrapped_state :any  =  {} ; 

    for ( var [k,v] of fp.map_items(args) ) {
	//for each key value pair create a react state object
	let [ obj , setter ] = React.useState(v as any) ;
	wrapped_state[k] = {
	    'get' : (()=>obj) ,
	    'set' : setter 
	} 
    }

    return wrapped_state ; 

}

