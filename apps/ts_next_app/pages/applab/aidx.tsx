import type { NextPage } from 'next'
import {useEffect, useState} from 'react' ; 
import Head from 'next/head'
import Image from 'next/image'
import styles from '../../styles/Home.module.css'
import { Button, ButtonGroup,Textarea, Spinner, Box, useToast, Select, Flex} from '@chakra-ui/react'

import {ObjectInspector } from 'react-inspector';


import * as tsn from "tidyscripts_node" ;
import * as tsw from "tidyscripts_web"  ; 

//const {Box} = tsw.components.chakra_ui ; 

const log = tsw.common.logger.get_logger({id:"aidx"}) ; 
const msgs = ["aidx", "is" , "the" , "best"]  ;

export async function getStaticProps(context :any) {
  /*
     This is where I can write nodejs code :) 
   */
  return {
    props: {msg :  msgs.join(" ") },
  }
  
}

declare var window : any ;
const ONE_LINER_ID = "one_liner" ;
const HP_ID = "hp" ;
const init_case_index = 0 ; 


/**
 * This init function is run in the useEFfect function of the component. 
 * Thus all of the DOM will be loaded at the time this runs 
 */
async function init() {
  
  Object.assign(window, {
    tsw , 
  })


} 

/**
 * Define the test cases 
 */
const test_cases = [
  { one_liner : "45 male with history of Diabetes, Hypertension, ESRD who presents with hypertension, chest pain, and shortness of breath" ,
    hp : "The patient states that on Monday which was about 1 week ago, he started experiencing shortness of breath and chest pain. the chest pain is continuous in nature and is rated as 7 out of 10. it does not radiate. it is not associated with food.  the patient missed his dialysis this morning. he also has abdominal discomfort. An electrocardiogram was done in clinic and was normal. His blood pressure was 190/106."
  } ,
  { one_liner : "78 female with history of scleroderma, ESRD, HTN who presents with weight loss" ,
    hp : "The patient has been experiencing decreased appetite and general weakness for the last several months. Her weight is stable from 2 years ago. Her physical exam is remarkable for cachexia, clear lung fields bilaterally, mild lower extremity edema, no abdominal pain. Her creatinine lab value is 3.3. Her hemoglobin lab value is 9.0." 
  } ,
  { one_liner : "55 year old, female, with history of diabetes and hypertension, who is presenting with acute onset of altered mental status" ,
    hp : "Her symptoms are remarkable for gait instability, altered, mental status, dizziness, and headache. Her physical exam is remarkable for altered, mental status, normal, muscular strength, dysmetria, normal reflexes. Her laboratory values are remarkable for sodium of 145, potassium at 3.8, blood glucose of 164, creatinine of 1.2, lactate of 1.9, white blood cell count of 6.0. Her home medication’s include aspirin, 81 mg daily, lisinopril 10 mg daily, met Forman 1 g twice today, and Eliquis, 5 mg twice a day."
  } 
] ;


    const Home: NextPage = (props : any) => {

  useEffect(  ()=> {init()} , [] ) ; //init script 

  let init_state = false ; 
  
  var [getting_query , set_getting_query]  = useState( init_state ) ;
  var [getting_cds   , set_getting_cds]    = useState( init_state ) ;
  var [structured_patient_data   , set_structured_patient_data]     = useState( {} as any ) ;
  var [diagnostic_response_data  , set_diagnostic_response_data]    = useState( {} as any ) ;       

  function set_case(index : number ) {
    let test_case = test_cases[index] ; 
    tsw.util.dom.set_value_by_id(ONE_LINER_ID, test_case.one_liner) ;
    tsw.util.dom.set_value_by_id(HP_ID       , test_case.hp       ) ;
  } 


  /**
   * Create the button click handlers 
   */

  const toast = useToast() ; 

  /**
   * The first handler extracts the one_liner and H&P text and sends it to the server to be translated to 
   * a structured representation 
   * When the result comes back the state variable is updated and the patient data variable is updated as well, which triggers the UI changes 
   */
  var handle_getting_query = async function() {

    log("Handling Query")

    let one_liner = (document.getElementById(ONE_LINER_ID) as any).value
    let hp = (document.getElementById(HP_ID) as any).value
    

    //ensure data is available
    if ( tsw.common.fp.is_empty(one_liner) || tsw.common.fp.is_empty(hp) ) { 
      toast({
	title: 'Error' , 
	description: 'Please input both the one liner and the H&P.' , 
	status: 'error',
	duration: 5000,
	isClosable: true,
      })

      return 

    }

    
    set_getting_query(true) ;       

    //handle the Toast
    toast({
      title: 'Query Submitted' , 
      description: 'Please be patient as we extract the structured patient data from the query, which may take up to 15 seconds. You might take a moment to review the one liner or H&P of the case.',
      status: 'info',
      duration: 6000,
      isClosable: true,
    })


    log(`PROCESSING INPUT:\n\nID: ${one_liner}\nH&P: ${hp}`)
    let result = await tsw.common.apis.aidx.generate_patient_data( {one_liner, hp })
    tsw.common.util.debug.add("query_result" , result) ;   
    log(`Got result:`) ; console.log(result) ; 
    set_getting_query(false) ;
    set_structured_patient_data(result) ; //Here we update the patient_data object

    toast({
      title: 'Success' , 
      description: 'Your query was decoded into structured information. Please explore the returned object by clicking or tapping it.', 
      status: 'success',
      duration: 6000,
      isClosable: true,
    })


    
    return result
  } 

  /**
   * The second one sends the structured information to the server to generate clinical decision support suggestiosn 
   */
  var handle_getting_cds = async function() {
    log("Handling cds")
    
    //first step is to check if the structured patient data is available 
    if (! tsw.common.fp.is_empty( structured_patient_data ) ) {

      set_getting_cds(true);
      
      toast({
	title: 'Analyzing' , 
	description: 'Please be patient as we generate a list of suggested diagnoses and high yield further workup ',
	status: 'info',
	duration: 7000,
	isClosable: true,
      })


      //do the query!
      let api_result = await tsw.common.apis.aidx.ai_cds(structured_patient_data)
      let data = api_result.data ;
      set_getting_cds(false);       
      set_diagnostic_response_data(data) ; 

      toast({
	title: 'Success' , 
	description: 'Your query was processed. Please explore the suggested diagnoses and potential further workup by clicking or tapping above.', 
	status: 'success',
	duration: 6000,
	isClosable: true,
      })

      

    } else {
      toast({
	title: 'Error' , 
	description: 'Please ensure that structured patient data is available for the query.' , 
	status: 'error',
	duration: 5000,
	isClosable: true,
      })
    }

    
  }

  var handle_case_selection = function(e : any) {
    let index = e.target.value ; 
    log(`case selection made: ${index}`)
    set_case(index) ; 
  } 

  const default_inspector_expansion = ['$', '$.*','$.*.*'] ; 
  
  return (
    <Box style={{padding : "20px"}} >
      <Head>
        <title>Tidyscripts</title>
        <meta name="description" content="AIDX (Ai Diagnostics)" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Box  >
        <h1 className={styles.title}>
          Welcome to <a href="https://github.com/sheunaluko/tidyscripts">AI Diagnostics</a>
        </h1>

        <p className={styles.description}>
          Clinical Decision Support powered by Artificial Intelligence
        </p>


	<Select placeholder='Select and edit a case or input your own one-liner and free-text H&P below:' onChange={handle_case_selection} style={{marginBottom : "20px"}} >
	  {
	    (tsw.common.fp.range(test_cases.length)).map( (x:any) => (<option key={x} value={x}>Case {x+1}: {test_cases[x].one_liner.slice(0,60)}...</option>)) 
	  }
	</Select>
	
        <Box>
	  
          <h1>One Liner:</h1>
          <Textarea id={ONE_LINER_ID} /> 

          <h1>H&P:</h1>
          <Textarea id={HP_ID}/>

        </Box>

	<Flex flexDirection="column" align="center">

	  <Button style={{marginTop : "30px"}} onClick={handle_getting_query}>
	    Generate Structured Medical Data
	  </Button>

	  <Box style={{marginTop : "30px" }}>
	    {
	      (function() {
		let spinner = ( <Spinner style={{marginTop : "30px" }}
					 thickness='4px'
					 speed='0.65s'
					 emptyColor='gray.200'
					 color='blue.500'
					 size='xl' 	/> )
		let data = ( <ObjectInspector data={structured_patient_data} expandPaths={default_inspector_expansion} /> ) 
		return ( getting_query ? spinner : data ) 
	      })()
	    }			       
	  </Box>

	  <Button style={{marginTop : "30px" }} onClick={handle_getting_cds}>
	    Generate Differential and Workup
	  </Button>


	  <Box style={{marginTop : "30px" }}>
	    {
	      (function() {
		let spinner = ( <Spinner style={{marginTop : "30px" }}
					 thickness='4px'
					 speed='0.65s'
					 emptyColor='gray.200'
					 color='blue.500'
					 size='xl' 	/> )
		let data = ( <ObjectInspector data={diagnostic_response_data} expandPaths={default_inspector_expansion}  /> ) 
		return ( getting_cds ? spinner : data ) 
	      })()
	    }			       
	  </Box>

	</Flex>
	
	
      </Box>

      <footer className={styles.footer}>
        <a
          href="https://www.tidyscripts.com"	  
        >
          Tidyscripts {' '}
          <span className={styles.logo}>
	    {(()=> {
	      let y = 20 ;
	      let x = Math.floor(1*y) ; 
	      return (
		<Image src="/tidyscripts_logo.png" alt="Tidyscripts Logo" width={x} height={y} />)})()}
          </span>
	  {'   '}     Copyright © 2023 Sheun Aluko, MD. All rights reserved. 
        </a>
      </footer>
    </Box>
  )
    }

export default Home




/*
   TODO: 
   - implement button click handlers:: 

   -- [x ] handle_getting_query
   tsw.common.apis.openai.aidx.generate_patient_data( {one_liner, hp })
   Extract one_liner from  document.getElementById("one_liner").value
   Extract hp from  document.getElementById("hp").value
   

   -- [ ] handle getting_cds 
   tsw.common.apis.openai.aidx.ai_cds( patient_data ) ; 
   get patient_data from result of query above. 

   -- so first step is implementing and testing the first handler 

 */
