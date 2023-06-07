'use client' ;

import React, { useState, useEffect, useRef } from "react";

import {
    Box,
    Button,
    FormControl,
    FormLabel,
    Input,
    Modal,
    ModalBody,
    ModalContent,
    ModalHeader,
    ModalOverlay,
    Select,
    Flex, 
    Image,
    Avatar,
    Text, 
    shouldForwardProp,
    Container ,
    Grid,
    GridItem, 
    Divider, 
    Progress,
    CircularProgress, 
    List,
    ListItem, 
} from "@chakra-ui/react";

import {
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
} from '@chakra-ui/react'

import { chakra } from '@chakra-ui/react'
import { motion, isValidMotionProp } from 'framer-motion'
import * as tsw from "tidyscripts_web"

import RL from "../../../components/RotatingLogo"


declare var speechSynthesis : any ;
declare var window : any ;
const tts_test_input_id = "voice_panel_test"  ; 


export default function Component() { 
    


    const vi = tsw.util.voice_interface    
    let vi_enabled = () => (vi.recognition_state == "LISTENING" || vi.recognition_state == "PAUSED" )

    let log = tsw.common.logger.get_logger({id:'vip'}) ; 
    
    const [micState, setMicState] = useState(0) 
    const [txtState, setTxtState] = useState("...")     
    const [enabledState, setEnabledState] = useState(vi_enabled()) 
    const [speechState, setSpeechState] = useState(false) 
    const [voicesState, setVoicesState] = useState([]) 
    const [micInterval ,setMicInterval ] = useState(null as any)

    const mic_max = useRef(0);


    
    
    let voice_result_handler =  async function(e :any) {
	console.log("Got recognition result!") 
	let text = e.detail.trim().toLowerCase()
	console.log(text) 
	setTxtState(text) 
	setSpeechState(false)
    }

    // ----------
    var t_last = performance.now()  ;
    
    var mic_handler =  async function(e :any) {
	let power = e.detail
	mic_max.current = Math.max(mic_max.current,power)
	let val = 100*(power/mic_max.current)
	let t_now = performance.now() ;

	if ( t_now-t_last > 50 ) { 
	    setMicState(val)
	    t_last = t_now ; 
	}

    }
    

    var get_voices = async function(){
	//wait until voices ready
	let voices_ready = function() { 
	    let voices = speechSynthesis.getVoices()
	    return (voices.length > 0 ) 
	}
	await tsw.common.asnc.wait_until(voices_ready, 3000, 500 ) ; 
	let voices = speechSynthesis.getVoices() ;
	log(`Got ${voices.length} voices`) ; 
	setVoicesState(voices)

	tsw.apis.local_storage.set_storage_header("tidyscripts")
    } 

    useEffect( () => {

	get_voices() ;
	
	window.addEventListener('tidyscripts_web_speech_recognition_result' , voice_result_handler)
	window.addEventListener('tidyscripts_web_mic' , mic_handler)

	
	var i  = setInterval(
	    function() {
		mic_max.current = 0 
	    } , 
	    10*1000
	)
	setMicInterval(i ) 	    

	
	
	return function result_cleanup() {
	    window.removeEventListener('tidyscripts_web_speech_recognition_result' , voice_result_handler)
	    window.removeEventListener("tidyscripts_web_mic" , mic_handler) 
	    clearInterval(micInterval) 
	} 
    }, [])

    

    
    
    const dm = "20px"

    
    return ( 
	
	    <Flex
		direction="column" 
		padding="20px">

		<Flex direction="row" justifyContent="space-between">
		    <Text fontSize="2xl"> Voice Interface Panel </Text>
		    <RL/>
		</Flex>

		<Divider marginTop={dm} marginBottom={dm} />

		<Text marginTop={0} marginBottom={dm}> SPEECH RECOGNITION (SR)     </Text>

		<Flex direction="row" align="center" justifyContent="space-around">
		    <Button  onClick={
		    function(){
			
			
			if (vi_enabled()) {
			    console.log("Stopping recog") 
			    vi.stop_recognition() 
			    setMicState(0) 
			    setEnabledState(false) 
			    setSpeechState(false) 
			} else { 
			    
			    let onSpeechStart = function () {
				setSpeechState(true)
			    }
			    
			    vi.initialize_recognition({onSpeechStart})
			    setEnabledState(true)
			} 

		    }
		    }>
			{ 
			    vi_enabled()  ? <Text>Disable SR</Text> : <Text>Enable SR</Text> 
			} 
		    </Button>


		    <Progress style={{flexGrow : 1, marginLeft : "10px"}} value={micState} />

		    
		</Flex>



		<Box marginTop={dm} > 
		    <Text>  Recognition Result: {txtState} </Text> 
		</Box>

		<Divider marginTop={dm} marginBottom={dm} />		
		
		<Box >
		    
		    <Text marginTop={0} marginBottom={dm}> TEXT TO SPEECH (TTS)     </Text>
		    
		    
		    
		    <Flex direction="row" justifyContent="space-around" > 
			<Button  onClick={()=> vi.speak( (document.getElementById(tts_test_input_id)! as any).value) }> 
			    Speak 
			</Button>
			
			<Input  style={{flexGrow : 1 , marginLeft : "10px"}} id={tts_test_input_id}  defaultValue="I will speak this" />		
		    </Flex>
		    
		    <br /> 
		    <br /> 			
		    
		    <Box> 
			

			Select TTS Voice

			    
			    <Box padding="10px" style={{maxHeight : "250px", marginTop: "2px", overflowY : "scroll"}}> 
				

				<List> 
				    { 
					voicesState.map( function(v : any) { 
					    return ( 
						<ListItem key={v.voiceURI}> 
						    <VoiceItem v={Object.assign(v,{tsw})} />
						</ListItem>
					)})
				    } 
				</List>
				
			    </Box>
			    
		    </Box>
		    
		    
		</Box>	    
		
		
	    </Flex> 
	    
    )

}



function VoiceItem(props : any) {
    
    let  v = props.v ;
    
    let buttonStyle = { 
	margin : "8px" 
    } 
    
    return (
	<Box>
	    <Flex justifyContent="space-between" align="center">
		<Text style={{flexGrow : 1 }}> 
		    {v.name} ({v.lang})
		</Text>
		<Button  margin="10px" 		    
			 onClick={()=> v.tsw.util.voice_interface.speak_with_voice( (document.getElementById(tts_test_input_id)! as any).value, v.voiceURI) }>Test</Button>
		<Button margin="10px"
			onClick={
			()=>{
			    let uri = v.voiceURI ; 
			    console.log("Storing default uri: " + uri)
			    v.tsw.apis.local_storage.store(uri, 'default_voice_uri') ;
			    
			}
			}
		>Select</Button>	    	    	    
	    </Flex>
	    <Divider/>
	</Box>
    ) 
} 



