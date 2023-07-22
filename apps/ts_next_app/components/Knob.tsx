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
	//  - ee
	console.log("init")
	setMeta(`2,${id}`)
    } ;

    let clean_up = function(){
	console.log("clean") 
	// - 
    };

    let [value, setValue] = React.useState(0) ;
    let [name, setName] = React.useState("") ;
    let [meta, setMeta] = React.useState("0,0") ;         

    useInit({init,clean_up}) ;


    var handleChange = function(e:any) {
	let val = e.value; 
	let data = meta ; 
	let [ch , id] = data.split(",").map( Number )  ; 
	log(`Request to control change with ch=${ch},id=${id},val=${val}`)
	setValue(val) ; 
	props.send_cc(ch,id,val) ; 
    }


	    return (
		<Flex style={{touchAction : "none" ,
			      margin : "5px" ,
			      padding : "5px" , 
			      border : "5px solid",
			      borderRadius : "5px" ,
			      borderWidth : "1px" , 
		}}>

		    <Flex direction="column">
			<Flex direction="row" style={{justifyContent:"space-between"}}>

			    <Box > 
				{name}
			    </Box>

			    
			    <InputText className="p-inputtext-sm" value={meta}
				       onChange={(e :any) => setMeta(e.target.value)}
				       style={{
					   width : "23%" 
				       }}
			    />

			    
			</Flex>


			<Flex justifyContent="center"> 
			    <Knob value={value} max={127} onChange={handleChange} size={150} />
			</Flex>		

			
		    </Flex>

		</Flex>

	    )
}


export default Component  ; 
