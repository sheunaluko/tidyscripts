"use client";

import React from 'react';

declare var window : any ; 

export default function useInit(args: any) {
    let { init, clean_up, assign_to_window } = args;

    React.useEffect(() => {

	(async function _init() { await (init as any)() })()

	if (typeof window !== "undefined") {
	    for ( var k of Object.keys(assign_to_window) ) {
		window[k as any]  = assign_to_window[k] 
	    } 
	}

	return (clean_up as any)

	
    }, [assign_to_window,init,clean_up]);

}

