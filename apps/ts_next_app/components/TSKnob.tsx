'use client';


import styles from '../styles/Knob.module.css' ; 
import useInit from "../hooks/useInit"  ;
import React from 'react' ; 


import * as tsw from "tidyscripts_web"  ;

const log = tsw.common.logger.get_logger({id:"knob"}) ;


import {
    Flex ,
    Box, 
} from "@chakra-ui/react";

import {
    Popover,
    PopoverTrigger,
    PopoverContent,
    PopoverHeader,
    PopoverBody,
    PopoverFooter,
    PopoverArrow,
    PopoverCloseButton,
    PopoverAnchor,
    ButtonGroup,
    Button,
    Slider,
    SliderTrack,
    SliderFilledTrack,
    SliderThumb 
} from '@chakra-ui/react'

import { CircularProgress, CircularProgressLabel } from '@chakra-ui/react'
import { motion, MotionConfig } from "framer-motion"



import {createPortal} from 'react-dom';


import { useDisclosure } from '@chakra-ui/react'

import { Card, CardHeader, CardBody, CardFooter, Divider } from '@chakra-ui/react'


declare var window :any ;

function Component(props : any) {

    let [value, setValue] = React.useState(0) ;
    let [ initTouchX, setInitTouchX ] = React.useState(null) ;
    let [ initTouchY, setInitTouchY ] = React.useState(null) ;
    let [ initVal, setInitVal ] = React.useState(null) ;
    let [ touchT, setTouchT ] = React.useState(performance.now()) ;         
    let [ tapX, setTapX ] = React.useState(null) ;
    let [ tapY, setTapY ] = React.useState(null) ;
    let [ open, setOpen ] = React.useState(false) ;
    let [ sensitivity, setSensitivity ] = React.useState(0.4) ;
    let [ arc, setArc ] = React.useState("") ;
    let [ arcB, setArcB ] = React.useState("") ;
    var svgRef = React.useRef(null) ; 
    let init = function() {
	log("init")
	let svgDim = svgRef.current.getBoundingClientRect() ;
	let sx = Math.round(svgDim.width/2)
	let sy = Math.round(svgDim.height/2)
	let r = Math.min(sx,sy) - 5 ;
	let bop = 1 ; 
	setArcB(describeArc(sx,sy,r,180+bop,360+180-bop ))
    }

    let clean_up = function(){log("clean")  };
    
    useInit({init,clean_up}) ;    
    

    
    function handleStart(evt) {

	//first detect a double click
	let t = performance.now()
	let delta  = t - touchT
	if (delta < 500) {
	    //double tap!
	    if (open) { return } 
	    let _tapX = evt.changedTouches[0].pageX ;
	    let _tapY = evt.changedTouches[0].pageY ;
	    setTapX(_tapX)
	    setTapY(_tapY) 
	    setOpen(true) ; 
	    log("double tap!")
	    return 
	}
	//not a double tap --
	setTouchT(t) 
	
	console.log(evt)
	window.debug1  = evt

	let te = evt.changedTouches[0] ;
	setInitTouchX(te.pageX); 
	setInitTouchY(te.pageY);
	setInitVal(value) ; 

	log(`Set init x,y to ${initTouchX}, ${initTouchY}`) ;

	evt.preventDefault();
	
    }

    
    function handleMove(evt) {
	evt.preventDefault();
	window.debug2 = evt;
	//console.log(evt)

	let te = evt.changedTouches[0] ;
	let currTouchX = te.pageX;
	let currTouchY = te.pageY;

	let xdiff = currTouchX - initTouchX ;
	let ydiff = currTouchY - initTouchY ;

	//log(`${initTouchX},${initTouchY},${currTouchX},${currTouchY},${xdiff},${ydiff}`)

	let mag = Math.round(Math.sqrt(Math.pow(xdiff,2) + Math.pow(ydiff,2))) ;

	
	let newValue = Math.round(initVal + xdiff*sensitivity - ydiff*sensitivity )

	if (newValue < 0  ) { newValue = 0   } ;
	if (newValue > 126) { newValue = 126 } ; 	

	setValue(newValue)
	if (props.send_cc) { 
	    props.send_cc(newValue) ;
	} 

	let svgDim = svgRef.current.getBoundingClientRect() ;
	
	let sx = Math.round(svgDim.width/2)
	let sy = Math.round(svgDim.height/2)
	let r = Math.min(sx,sy) - 5 ; 
	let new_arc = describeArc(sx,sy,r,180,(newValue/126)*359.99 + 180)

	//log(`${sx},${sy},${r},${newValue},${new_arc}`)
	
	setArc(new_arc) 
	
    }




    function Modal() {
	if(!open)return null;
	return createPortal(
	    <Flex
		direction="column"
		alignItems="center"
		style={{
		    position : "absolute" ,
		    left : tapX + 50 ,
		    top : tapY - 20 ,
		    borderWidth : "2px", 
		    borderRadius : "10px", 
		    padding : "6px" , 
		    backgroundColor : "lightblue" 

		    
		}}>
		<Flex direction="row">
		    Configure
		    <Button marginLeft="10px" borderRadius="30px" size="xs" colorScheme="green" onTouchStart={
		    function(e) {
			setOpen(false)
		    } 
		    }>x</Button>
		</Flex>

		<Slider onChangeEnd={(val) => setSensitivity(val)}
			defaultValue={sensitivity} min={0.2} max={0.6} step={0.05}>
		    <SliderTrack bg='blue.100'>
			<Box position='relative' right={10} />
			<SliderFilledTrack bg='blue' />
		    </SliderTrack>
		    <SliderThumb boxSize={6} />
		</Slider>
		
	    </Flex>
	    , document.body
	)
    }


    return (
	<Box style={{
	    //width : "100%" ,
	    //height : "100%" , 
	}}>
	<Flex
	onTouchStart={handleStart}
	onTouchMove={handleMove}
	direction="row"
	justifyContent="center"
	alignItems="center"
	style={{margin : "5px" ,
		padding : "5px" , 
		border : "1px solid",
		userSelect : 'none' , 
		borderRadius : "8px" ,
		borderColor : "#cbd1cf",
		//borderWidth : "1px" ,
		//width: "100%",
		//height : "100%" ,
		touchAction : "none",
		WebkitUserSelect : "none",  
	}}>


	<svg  ref={svgRef} width="4vw" height="4vw">
	    <path fill="none" stroke="#cbd1cf" strokeWidth="5" d={arcB} />	    	    
	    <path fill="none" stroke="#446688" strokeWidth="5" d={arc} />

	    <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle">{value}</text>    
	    
	</svg>


	    </Flex>
	    <Modal />
			</Box>

    )
}


export default Component  ;



function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
    var angleInRadians = (angleInDegrees-90) * Math.PI / 180.0;

    return {
	x: centerX + (radius * Math.cos(angleInRadians)),
	y: centerY + (radius * Math.sin(angleInRadians))
    };
}

function describeArc(x, y, radius, startAngle, endAngle){

    var start = polarToCartesian(x, y, radius, endAngle);
    var end = polarToCartesian(x, y, radius, startAngle);

    var largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    var d = [
        "M", start.x, start.y, 
        "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");

    return d;       
}
