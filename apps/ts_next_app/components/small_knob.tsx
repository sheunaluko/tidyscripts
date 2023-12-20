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

    const id = props.id || 1


    
    let init = function() {
	console.log("init")
	let init_value = props.initValue || 0
	setValue(  init_value )
    } ;

    let clean_up = function(){
	console.log("clean") 
	// - 
    };

    let [value, setValue] = React.useState(0) ;
    let [name, setName] = React.useState("") ;


    useInit({init,clean_up}) ;


    var handleChange = function(e:any) {
	let val = e.value; 
	setValue(val) ; 
	props.send_cc(val) ; 
    }


	    return (
		<Flex style={{touchAction : "none" ,
			      padding : "5px" , 
		}}>

		    <Flex direction="column">

			<Flex justifyContent="center"> 
			    <Knob value={value} max={127} onChange={handleChange} size={60} />
			</Flex>		

			
		    </Flex>

		</Flex>

	    )
}


export default Component  ; 
