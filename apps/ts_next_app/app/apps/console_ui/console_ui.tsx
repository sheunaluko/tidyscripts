'use client';

import type { NextPage } from 'next'
import {useEffect, useState } from 'react' ;
import React from 'react' ; 
import styles from '../../../styles/Default.module.css'

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
	 Input, InputGroup, InputLeftAddon 
} from '@chakra-ui/react'
import { PhoneIcon, AddIcon, WarningIcon, SettingsIcon } from '@chakra-ui/icons'
import {ObjectInspector } from 'react-inspector';

import useInit from "../../../hooks/useInit" 

import * as tsw from "tidyscripts_web"  ;

const log = tsw.common.logger.get_logger({id:"cui"}) ;
export var previous_key_handler : any  = null ;

declare var window :  any ;


const Component: NextPage = (props : any) => {
  
  /*
     Create the feedback 
  */ 
  var [ cmd_result , set_cmd_result ] = useState( ({} as any) ) ;


  

  let input_handler = function() { 
    let i = window.document.getElementById("cmd_input")
    let v = i.value ;  
    log(`Evaluating input value: ${v}`)
    var result : any = null ; 
    try { 
      result  = window.eval(v) ;
    } catch (e : any) {
      result = e 
    } 
    set_cmd_result(result) 
  } 


  let init = async function () { 
    
    //save a reference to the prior handler 
    previous_key_handler = window.onkeypress ;

    window.tsw = tsw ; 

    window.onkeypress = function(e :any)  {  
      //log(`Keypress: ${e.key}`) 
      if (e.key == 'Enter' ) {
	input_handler() 
      } else { 
      } 
    } 
  } ; 

  let clean_up = async function () { 
    //put back the previous handler 
    log('Putting back old key handler') 
    window.onkeypress = previous_key_handler ; 
  }  ; 

  useInit({init,clean_up}) ;

  const default_inspector_expansion = ['$', '$.*','$.*.*'] ;

  return (


    <Flex direction="column" style={{width : "100%",
				     minHeight : "50vh" ,
				     alignItems : 'center',
				     justifyContent : 'space-between' 
    }} >
      
      <h1 className={styles.title}>   Console UI </h1>

      <InputGroup>
	<InputLeftAddon> {">"} </InputLeftAddon>
	<Input id="cmd_input" size="md"  placeholder='Input command' ></Input>
      </InputGroup>

      <ObjectInspector style={{width: "50%"}} data={cmd_result} expandPaths={default_inspector_expansion} /> 

    </Flex>

    
  )

}


export default Component ; 
