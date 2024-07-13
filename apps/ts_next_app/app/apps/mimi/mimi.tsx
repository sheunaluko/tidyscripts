'use client';

import type { NextPage } from 'next'
import {useEffect, useState } from 'react' ;
import React from 'react' ; 
import styles from '../../../styles/Default.module.css'

import { ChakraProvider } from '@chakra-ui/react'

import TSKnob from "../../../components/TSKnob" 


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
	 Slider,
	 Text, 
	 Input, InputGroup, InputLeftAddon 
} from '@chakra-ui/react'

import { ArrowUpIcon} from "@chakra-ui/icons"


import useInit from "../../../hooks/useInit" 

import * as tsw from "tidyscripts_web"  ;

const log = tsw.common.logger.get_logger({id:"mimi"}) ;

declare var window :  any ;

var ws_connection : any = null ;


/*
   A good architecture is to think of all the things that I would want to control for a 
   particular channel. 
   - low pass , high pass, reverb, delay, pan , compressor volume  

   
   Yes I want to think about a hub architecture where all of the state is routed through an object that can be snapshotted --- OR a decentralized architecture where each component upon mount creates a deterministic uuid and writes to localstorage its state upon unmount (this second ** architecture seems better). Then upon re-mount the state is regenerated... 

 Another way to achieve this is to create an abstraction over the control change messages; so that the component calls a wrapper function instead of the websocket directly. Based on the channel and control value to control should be able to read the last known value from the abstraction layer 

I was thinking of a client server architecture to publish the app as well.. could go to the website on the ipad and also on the computer. a server in the cloud relays the traffic and the computer browser connects to the virtual midi device 

**idea ** I could use webtransport or websocket to stream from ipad to cloud service to desktop chrome and then output to virtual midi device. Then a user could login to the platform on ipad or iphone and ALSO on desktop to complete the connection 

Todo: 
[ ] ?? bluetooth coms with webview 
[ ] XY filter controller 




 */




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

	wsurl = 'ws://192.168.12.104:8001'
	
	ws_connection = new WebSocket(wsurl) ;
	log("Connected?")	
	
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

    function send_cc_2(ch : number, num : number ) {
	return function(value : number) { 
	    let msg = cc(ch,num,value) ; 
	    ws_connection.send(msg) ;
	}
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


    let OrientationWidget = function() {
	return (<>
	    <Box id="arrowBox" marginBottom="20px">
		<ArrowUpIcon boxSize={40} />
	    </Box>
	    <p>
		{orientation.alpha} | {orientation.beta} | {orientation.gamma} 
	    </p>
	</>)
    }


    let PadWidget = function() {
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



    let MetaKnob = TSKnob ;

    let KnobWidget = function() {
	return (
	    <Grid
		templateRows='repeat(7, 1fr)'
		templateColumns='repeat(4, 1fr)'
		gap={6}
		marginTop="20px"
	    >

		{ tsw.common.fp.range(15).map(
		      (i:number) => <GridItem key={i}> <MetaKnob send_cc={send_cc} id={i+1} />  </GridItem>
		  )} 
	    </Grid>
	) 
    }

    
    let ChannelWidget = function(props : any) {

	let bH = "20px" ; let bW = "50px" ; let bM = "10px"

	let CH = props.channel_number || 1 ;

	let CC_BASE_NUM = (CH-1)*8  ; 

	let [mute, setMute] = React.useState(false) ;
	let [record, setRecord] = React.useState(false) ;
	let [stopTouch, setStopTouch] = React.useState(false) ; 		
	
	return (
	    <Flex direction="column" align="center" justifyContent="end" width="100%">
	    <MetaKnob send_cc={send_cc_2(2,CC_BASE_NUM+8)}  />
	    <MetaKnob send_cc={send_cc_2(2,CC_BASE_NUM+7)}  />
	    <MetaKnob initValue={126} send_cc={send_cc_2(2,CC_BASE_NUM+6)}  />
	    <MetaKnob send_cc={send_cc_2(2,CC_BASE_NUM+5)}  />
	    <Button
	    height={bH}
	    width={bW}
	    marginTop={bM}
	    onClick={function() {
		send_cc(2,CC_BASE_NUM+4, mute ? 127 : 0 ) ; 
		setMute( !mute);
	    } }
	    style={{backgroundColor: (mute ? "" : "lightgreen" )}} 
	    > </Button>
	    <Button
	    height={bH}
	    width={bW}
	    marginTop={bM}
	    onClick={function() {
		send_cc(2,CC_BASE_NUM+3, record ? 0 : 127 ) ; 
		setRecord( !record) }
	    }
	    style={{backgroundColor: (record ? "pink" : "" )}} 
	    > </Button>
	    <Button
	    height={bH}
	    width={bW}
		marginTop={bM}
		marginBottom={bM}
	    style={{backgroundColor : (stopTouch? "pink" : "")}} 
	    onClick={function() {
		send_cc(2,CC_BASE_NUM+2, 127 ) ; 
	    }}
	    onTouchStart={ function() {   setStopTouch(true) } 	    }
	    onTouchEnd={ function() { setStopTouch(false) }  	    }
	    > </Button>

	    <MetaKnob initValue={75} send_cc={send_cc_2(2,CC_BASE_NUM+1)} />
	    
	    <Button
		    height={bW}
		    width={bW}
		    marginTop={bM}
		    style={{backgroundColor: 'lightblue' }} 
		>{CH}</Button>

		
	    </Flex>
	) 

	    }

    let BusWidget = function(props : any) {

	let bH = "20px" ; let bW = "50px" ; let bM = "10px"

	let CH = props.channel_number || 1 ;

	let CC_BASE_NUM = 112  ;
	
	switch (CH) {
	    case 'R' :
		break; 
	    case 'D' :
		CC_BASE_NUM = 116
		break; 
	    case 'M' :
		CC_BASE_NUM = 120  
	} 


	let [mute, setMute] = React.useState(false) ;
	
	return (
	    <Flex direction="column" align="center" justifyContent="end">
		<MetaKnob initValue={126} send_cc={send_cc_2(2,CC_BASE_NUM+4)}  />
		<MetaKnob send_cc={send_cc_2(2,CC_BASE_NUM+3)}  />
		<Button
		    height={bH}
		    width={bW}
		    marginTop={bM}
		    onClick={function() {
			send_cc(2,CC_BASE_NUM+2, mute ? 127 : 0 ) ; 
			setMute( !mute);
		    } }
		    style={{backgroundColor: (mute ? "" : "lightgreen" )}} 
	    > </Button>

	    <Button
		height={bH}
		width={bW}
		marginTop={bM}
		onClick={function() {
		} }
		style={{backgroundColor: ""}} 
	    > </Button>

	    <Button
		height={bH}
		width={bW}
		marginTop={bM}
		onClick={function() {
		} }
		style={{backgroundColor: ""}} 
	    > </Button>
	    

	    
	    <MetaKnob initValue={75} send_cc={send_cc_2(2,CC_BASE_NUM+1)} />
	    
	    
	    <Button
		height={bW}
		width={bW}
		marginTop={bM}
		style={{backgroundColor: 'lightblue' }} 
	    >{CH}</Button>

	    
	    </Flex>
	) 

    }
    
    let ChannelRack = function(props : any) {
	return (
	    <Flex
		width="100%"
		direction="row"
		style={{
		    //touchAction : "none" ,
		    margin : "5px" ,
		    padding : "20px" , 
		    //border : "5px solid",
		    borderRadius : "15px" ,
		    borderWidth : "1px",
		    overflowX : 'scroll' 

		}} > 

		{ props.chs.map(
		      (i:any) => <ChannelWidget channel_number={i} key={i}/>
		  )}
		
	    </Flex> 
	)
	
    }

     let BusRack = function(props : any) {
	return (
	    <Flex
		width="100%"
		direction="row"
		
		style={{
		    //touchAction : "none" ,
		    margin : "5px" ,
		    padding : "20px" , 
		    //border : "5px solid",
		    borderRadius : "15px" ,
		    borderWidth : "1px",
		    overflowX : 'scroll' 

		}} > 

	{ props.chs.map(
		      (i:any) => <BusWidget channel_number={i} key={i}/>
		  )}
		
	    </Flex> 
	)
	 
     }

    const MixerWidget = function() {
	return (
	    <Flex direction="row"  height="40%" width="100%" align="stretch" >
		<Flex marginTop="5px" width="77%" direction="row" align="center" >
		    <ChannelRack chs={tsw.common.fp.range(1,15)} />
		</Flex>
		<Flex marginTop="5px" width="23%"  direction="row" >
		    <BusRack chs={["R", "D" , "M"]} />
		</Flex>
	    </Flex>
	) 
    } 


    let panels = ["mixer", "pads" , "knobs" ] 

    let KnobTest = function() {
	return (
	    <>
		<TSKnob />
		<TSKnob /> 
		
	    </>
	) 
    } 

    let panel_dictionary =  {
	"mixer"  : MixerWidget(),
	"pads"   : PadWidget(),
	"knobs"  : KnobWidget(),
	"tsknob" : KnobTest(), 
    } 

    let [panel_state, set_panel_state ] = React.useState("mixer"); 

    
    return (

	<ChakraProvider>
	    <Flex direction="row" align="center" width="98%" justifyContent="left" > 
		M I M I
	    </Flex>
	    <Flex direction="row" align="center" width="98%" 
		  style={{
		      padding : "10px" , 
		      //border : "5px solid",
		      borderRadius : "15px" ,
		      borderWidth : "1px",
		      overflowX : 'scroll'}} 
	    >
	{
	    panels.map( (p:string) =>
		<Button borderRadius="10%" marginRight="15px" key={p}
		    onClick={function(e:any){
			set_panel_state(p) 
			}}
		>
		    <Text fontSize="sm">{p.toUpperCase()}</Text>
		</Button>
	    )
	}


	    </Flex>

	    {
		// @ts-ignore 
		panel_dictionary[panel_state]
	    } 

	</ChakraProvider>
    )

}


export default Component ; 
