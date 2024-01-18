'use client';


import styles from '../styles/Knob.module.css' ; 
import useInit from "../hooks/useInit"  ;
import React from 'react' ; 


import 'primereact/resources/themes/saga-blue/theme.css';
import 'primereact/resources/primereact.min.css';


import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';

import { Knob } from 'primereact/knob' ; 

import * as tsw from "tidyscripts_web"  ;

const log = tsw.common.logger.get_logger({id:"knob"}) ;


import {
    Flex ,
    Box, 
} from "@chakra-ui/react";


declare var window :any ;

function Component(props : any) {

    
    let init = function() {
	console.log("init")
    } ;

    let clean_up = function(){
	console.log("clean") 
    };

    let [value, setValue] = React.useState("0,0") ;

    useInit({init,clean_up}) ;

    let [ initTouchX, setInitTouchX ] = React.useState(null) ;
    let [ initTouchY, setInitTouchY ] = React.useState(null) ;
    let [ touchT, setTouchT ] = React.useState(performance.now()) ;         


    function handleStart(evt :any) {
	evt.preventDefault();

	//first detect a double click
	let t = performance.now()
	let delta  = t - touchT
	if (delta < 500) {
	    //double tap!
	    window.alert("you double tapped!")
	    return 
	}
	//not a double tap --
	setTouchT(t) 
	    
	    console.log(evt)
	    window.debug1  = evt

	    let te = evt.changedTouches[0] ;
	setInitTouchX(te.pageX); 
	setInitTouchY(te.pageY); 

	log(`Set init x,y to ${initTouchX}, ${initTouchY}`) ; 
	
    }

    function handleMove(evt :any) {
	evt.preventDefault();
	window.debug2 = evt;
	//console.log(evt)

	let te = evt.changedTouches[0] ;
	let currTouchX = te.pageX;
	let currTouchY = te.pageY;

      // @ts-ignore 
      let xdiff = currTouchX - initTouchX ;
      // @ts-ignore       
      let ydiff = currTouchY - initTouchY ;

      //log(`${initTouchX},${initTouchY},${currTouchX},${currTouchY},${xdiff},${ydiff}`)

	setValue(`${xdiff},${ydiff}`)
    }






    return (
	<Flex
	    onTouchStart={handleStart}
	    onTouchMove={handleMove}
	    direction="row"
	    justifyContent="center"
	    alignItems="center"
	    style={{margin : "5px" ,
		    padding : "5px" , 
		    border : "5px solid",
		    userSelect : 'none' , 
		    borderRadius : "5px" ,
		    borderWidth : "1px" ,
		    width: "60px",
		    height : "60px" ,
		    touchAction : "none",
		    WebkitUserSelect : "none",  
	    }}>

	    <Box >

		{value} 

	    </Box>

	</Flex>

    )
}


export default Component  ; 
