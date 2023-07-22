'use client';

import type { NextPage } from 'next'
import {useEffect, useState } from 'react' ;
import React from 'react' ; 
import styles from '../../../styles/Default.module.css'

import Knob from "../../../components/Knob" 

import { Button,
	 ButtonGroup,
	 Textarea,
	 Spinner,
	 Box,
	 useToast,
	 useDisclosure,
	 Select,
	 Flex,
	 Icon,
	 Grid,
	 GridItem, 
	 Input, InputGroup, InputLeftAddon 
} from '@chakra-ui/react'

import { ArrowUpIcon} from "@chakra-ui/icons"

import useInit from "../../../hooks/useInit" 

import * as tsw from "tidyscripts_web"  ;

const log = tsw.common.logger.get_logger({id:"mimi"}) ;

declare var window :  any ;

var ws_connection : any = null ; 

const Component: NextPage = (props : any) => {

    let [orientation, setOrientation] = useState({} as any) ;


    var conn : any  = null ; 
    
    let orientation_handler = function(event:any) {
	//console.log(e)
	let { alpha, beta, gamma } = event ;
	let e = {
	    alpha : Math.round(alpha) ,
	    beta  : Math.round(beta)  ,
	    gamma : Math.round(gamma)  , 
	}

	let arr = window.document.getElementById("arrowBox") ; 
	arr.style.transform = `rotateZ(${-e.alpha}deg) rotateX(${e.beta}deg) rotateY(${e.gamma}deg)`;
	setOrientation( e  ) 
    }

    let gamma_to_cc_transform = function(g : number) {
	//transforms gamma
	let cc = (g + 90)* (127/180)
	return cc ; 
    } 

    let component_id = 'do.app.viz' 

    let init = async function () { 
	window.tsw = tsw ;
	window.note = note ;
	window.send_note = send_note ;
	window.send_cc = send_cc ; 
	//tsw.apis.sensor.subscribe_to_orientation(component_id, orientation_handler)  ;


	//we will connect to the websocket
	log("Connecting to websocket")
	let wsurl = "wss://cloudtolocal.custom:8001" ;

	if (window.location.host == 'localhost:3000') {
	    wsurl = 'wss://localhost:8001' 
	}
	
	ws_connection = new WebSocket(wsurl) ;
	log("Connected")	
	
    } ;




    let echo_init = async function () { 
	window.tsw = tsw ;
	window.note = note ;
	window.send_note = send_note ; 


	//we will connect to the websocket
	log("Connecting to websocket")
	let wsurl = "wss://cloudtolocal.custom:8001" ;

	if (window.location.host == 'localhost:3000') {
	    wsurl = 'ws://192.168.12.104:8001' 
	}
	
	ws_connection = new WebSocket(wsurl) ;
	 log("Connected")



	 ws_connection.addEventListener('message' , function(data : any) {
	     window.last_receipt = tsw.common.util.performance.ms()
	     log(`T elapsed: ${window.last_receipt- window.last_sent}`)
	 })

	 window.test = function() {
	     window.last_sent = tsw.common.util.performance.ms()
	     send_note(20,true, true) 
	 }

	 window.repeat_test = function(rate : number) {
	     window.interval  = setInterval( window.test,  rate) 
	 } 
	 
	 
     } ; 

    let clean_up = async function () {
	tsw.apis.sensor.unsubscribe_orientation_id(component_id) ; 
    }  ; 

    useInit({init,clean_up}) ;

    /*
       On pixel 7: 
       alpha runs from 0-360 and is the compass axis 
       beta runs from -180 t0 180
       gamma runs -90 (leftward rotation), +90 (rightward)

       see this ~> https://developer.mozilla.org/en-US/docs/Web/API/Device_orientation_events/Orientation_and_motion_data_explained


     */


    function note(i : number, on : boolean , timestamp : boolean) {
	var msg_bytes : any = null ;
	if (on) { 
	    msg_bytes  = tsw.common.midi_encoder.note_on(1,i,127) ; 
	} else {
	    msg_bytes = tsw.common.midi_encoder.note_off(1,i,127) ; 
	}
	
	if (timestamp) {
	    return tsw.common.util.bytes.prepend_timestamp_as_bytes(msg_bytes) 
	} else {
	    return msg_bytes
	} 
    }

    function send_note(i : number, on : boolean , timestamp : boolean) {
	let msg = note(i,on,timestamp) ;
	ws_connection.send(msg) ; 
    }


     function cc(ch : number, id : number , value : number ) {
	var msg_bytes : any = null ;
	 msg_bytes = tsw.common.midi_encoder.control_change(ch,id,value) ;
	 msg_bytes = tsw.common.util.bytes.prepend_timestamp_as_bytes(msg_bytes) 
	 return msg_bytes

     }

    function send_cc(ch : number, num : number , value : number ) {
	let msg = cc(ch,num,value) ; 
	ws_connection.send(msg) ; 
    }

    
    function getGridItem(index : number) {
	let i = index ;
	let sz  = "160px" ; 
	let w   = sz   ; 
	let h = sz     ; 

	let onclick = function(e : any) {
	    e.preventDefault() 
	} 

	let touchstart = function(e : any) {
	    send_note(i,true,true) ; 
	} 

	let touchend = function(e : any ) {
	    send_note(i,false,true) ; 
	}

	return (<GridItem key={i} w={w} h={h}>
	    <div onClick={onclick}
		 onTouchStart={touchstart}
		 onTouchEnd={touchend}
		 style={{
		     backgroundColor : "gray",
		     borderRadius : '5px' ,
		     padding : '3px',
		     width : "100%" ,
		     height : "100%" ,
		     
		 }}>
		{i.toLocaleString('en-US', {minimumIntegerDigits : 2, useGrouping :false })   } 
	    </div>
	</GridItem>)

	
    } 


    let orientationWidget = function() {
	return (<>
	    <Box id="arrowBox" marginBottom="20px">
		<ArrowUpIcon boxSize={40} />
	    </Box>
	    <p>
		{orientation.alpha} | {orientation.beta} | {orientation.gamma} 
	    </p>
	</>)
    }


    let padWidget = function() {
	return (

	    <Grid
		templateRows='repeat(7, 1fr)'
		templateColumns='repeat(4, 1fr)'
		gap={6}
		marginTop="20px"
	    >
		{tsw.common.fp.range(21,100).map(getGridItem)}
	    </Grid>
	    
	) 
    } 



    
    return (


	<Flex direction="column" align="center" justifyContent="space-around" >


	    <h2 className={styles.title}>   M I M    I </h2>

	    <Flex marginTop="30px"  direction="row" align="center" justifyContent="space-between">

		<Grid
		    templateRows='repeat(7, 1fr)'
		    templateColumns='repeat(4, 1fr)'
		    gap={6}
		    marginTop="20px"
		>

		    { tsw.common.fp.range(15).map(
			  (i:number) => <GridItem key={i}> <Knob send_cc={send_cc} id={i+1} />  </GridItem>
		      )} 
		</Grid>
		
	    </Flex>

	</Flex>

	
    )

}


export default Component ; 
