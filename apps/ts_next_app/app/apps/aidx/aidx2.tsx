'use client';

import type { NextPage } from 'next'

import {useEffect, useState } from 'react' ;
import React from 'react' ; 
import styles from '../../../styles/Default.module.css'
import { ChakraProvider } from '@chakra-ui/react'
import {
    Button,
    ButtonGroup,
    Textarea,
    Text,
    Spinner,
    Box,
    useToast,
    useDisclosure,
    Select,
    Flex,
    Icon,
    Accordion,
    AccordionItem,
    AccordionButton,
    AccordionPanel,
    AccordionIcon,
    Radio,
    RadioGroup,
    Stack,
} from '@chakra-ui/react'
import { PhoneIcon, AddIcon, WarningIcon, SettingsIcon,  } from '@chakra-ui/icons'

import * as tsw from "tidyscripts_web"  ;

import useStateWrapper from "../../../hooks/useStateWrapper" ; 

const log = tsw.common.logger.get_logger({id:"aidx"}) ; 

declare var window : any ;

/*
  TODO: 
  - change ui to use state instead of ID's for the config 
  [ ] -- still working on this and getting a re-rendering bug -- may need to pass in a state object to each subcomponent and have them manage their states independently 
  -- and then have a component level state object that holds references to the sub states ?  
  
  - this will eliminate bug of 0 config after state update
  - store the queries in localstorage 
  - add follow up chat interface (create chat interface first that allows for setting the messages parameter ) 
*/

const FREE_TEXT_ID = "free_text" ;
const SYSTEM_ID = "system" ;
const PROMPT_ID = "prompt" ;
const SELECT_MODEL_ID = "select_model" ; 


const default_queries = [
    `42 year old female with past medical history of hypertension and diabetes who presents with microscopic hematuria and proteinuria. In clinic today blood pressure is 152/96. Her serum creatinine value is 0.82.` ,
    `20 year old male presents with chest pain and shortness of breath. Oxygen saturation is 92% on room air. Chest xray reveals widened mediastinum.`
] ; 


const Component: NextPage = (props : any) => {

    const toast = useToast() ;

    let initUIState = {
	'SYSTEM_MSG' : `You are an advanced medical assistant designed to aid in diagnosis and treatment of patients` ,
	'PROMPT'  : `Given the supplied medical information, please provide a ranked list of likely diagnoses. For each diagnosis, include 2-4 sentences of your reasoning. For every explanation, include a quantitative analysis on how any lab values being low or high, or any imaging or physical exam findings contributed to the reasoning.`,
	'USER_TXT' : default_queries[1] ,
	'MODEL' :  'gpt-3.5-turbo'  , 
    } ; 

    let uiState = useStateWrapper(initUIState) ;
    let [prompt,setPrompt] = React.useState("") 
    let [state, setState] = useState("init") ;
    let [result, setResult] = useState(null as any) ;     
    
    
    /* 
       Function for creating the chat completions query from the UI state 
    */
    let create_chat_query = function() {

	let init_prompt = `Medical information:\n${uiState.USER_TXT.get()}\n\n${uiState.PROMPT.get()}`

	let data = {
	    max_tokens : 1024,
	    model : uiState.MODEL.get(),
	    messages : [
		{'role' : 'system' , 'content' : uiState.SYSTEM_MSG.get()},
		{'role' : 'user'   , 'content' : init_prompt} , 
	    ]
	}

	let fetch_params =  {
	    method:'post',
	    body : JSON.stringify(data),
	    headers: {"Content-Type": "application/json"} , 
	}

	
	return fetch_params 

    } 
    
    
    /**
     * This init function is run in the useEFfect function of the component. 
     * Thus all of the DOM will be loaded at the time this runs 
     */
    async function init() {
	
	Object.assign(window, {
	    tsw ,
	    create_chat_query,
	    uiState, 
	})


	toast({
	    title: 'Welcome' , 
	    description: 'Welcome to AIDX: Clinical Decision Support Powered by AI' , 
	    status: 'success',
	    duration: 5000,
	    isClosable: true,
	})


	
    }
    

    useEffect(  ()=> {init()} ) ; //init script

    

    

    let run = async function() {
	let query = create_chat_query()
	setState("querying") ;
	toast({
	    title: 'Query Submitted' , 
	    description: 'Please note that the response can take between 10-20 seconds' , 
	    status: 'info',
	    duration: 3000,
	    isClosable: true,
	})
	
	let _response = await fetch("/api/openai_chat", query) ;
	let json = await _response.json()
	setState("query_result")
	setResult(json)
    } 





    let ResultWidget = function() {
	if (state == 'querying' ) {
	    return <Spinner style={{marginTop : "20px" }}
			    thickness='4px'
			    speed='0.65s'
			    emptyColor='gray.200'
			    color='blue.500'
			    size='xl' 	/>
	}

	if (state == 'query_result') {
	    return (
		<>
		    <h3> Got result in {result.t_elapsed/1000} seconds: </h3>
		    <Box>
			{result.response.content.split("\n\n").map((t:string)=><Text key={t.slice(0,20)} style={{marginTop : "20px"}}>
										   {t}
									       </Text>)
			}
		    </Box>
		</>
	    )
	}

	return (
	    <></>
	)
    } 

    

    
    return (
	<ChakraProvider>
	    <Box style={{'width' : "100%" , 'overflowX' : 'hidden' }}>
		<h1 className={styles.title}>
		    Welcome to <a href="https://github.com/sheunaluko/tidyscripts">AI Diagnostics</a>
		</h1>

		<p className={styles.description}>
		    Clinical Decision Support powered by Artificial Intelligence
		</p>

		<ConfigAccordion style={{marginTop : "20px",marginBottom : "20px",}} uiState={uiState} />	    

		<Box padding="30px">

		    
		    <h3>Medical Information:</h3>
		    <Textarea id={FREE_TEXT_ID} value={uiState.USER_TXT.get()} onChange={(e:any)=> uiState.USER_TXT.set(e.target.value)}  />


		    
		    <Button onClick={run} style={{marginTop : "15px" , marginBottom : "15px"}}>Analyze </Button>

		    <Box>

			<ResultWidget/>

		    </Box>


		    
		</Box>
		
	    </Box>
	</ChakraProvider> 

    )
}

export default Component



var ConfigAccordion = function(props : any) {

    let [expState,setExpState] = useState(-1) ; 
    
    return (
	<Box style={props.style}>
	    <Accordion allowToggle index={expState} onChange={ (i:number)=>setExpState(i) }>
		<AccordionItem>
		    <Flex direction="column"> 
			<AccordionButton>
			    <Box as="span" flex='1' textAlign='left'>
				<h1>Configuration</h1>
			    </Box>
			    <AccordionIcon />
			</AccordionButton>
			<AccordionPanel pb={8}>
			    {ConfigUI(props.uiState)}
			</AccordionPanel>
		    </Flex>
		</AccordionItem>
	    </Accordion>
	</Box>
    ) 
} 


var ConfigUI = function(uiState : any) {


    
    return (
	
	<Box id="config_box"> 

	    <h3>Select AI Model:</h3>
	    <RadioGroup onChange={(v:string)=> uiState.MODEL.set(v)} value={uiState.MODEL.get()} style={{marginBottom : "20px" }}>
		<Stack direction='row'>
		    <Radio  value={"gpt-3.5-turbo"}>gpt-3.5-turbo</Radio>
		    <Radio  value={"gpt-4"}>gpt-4</Radio>	  
		</Stack>
	    </RadioGroup>


	    <h3>System Prompt:</h3>

	    <Textarea id={SYSTEM_ID} value={uiState.SYSTEM_MSG.get()} onChange={(e:any)=> uiState.SYSTEM_MSG.set(e.target.value)} /> 

	    <h3>User Prompt:</h3>

	    <Textarea id={PROMPT_ID} value={uiState.PROMPT.get()} onChange={(e:any)=> uiState.PROMPT.set(e.target.value) }  />

	</Box>

    ) 
}
