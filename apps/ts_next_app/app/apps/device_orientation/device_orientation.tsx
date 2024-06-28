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

import { ArrowUpIcon} from "@chakra-ui/icons"

import useInit from "../../../hooks/useInit" 

import * as tsw from "tidyscripts_web"  ;

const log = tsw.common.logger.get_logger({id:"orientation"}) ;

declare var window :  any ;

const Component: NextPage = (props : any) => {

  let [orientation, setOrientation] = useState({} as any) ;


  
  let orientation_handler = function(event:any) {
    //console.log(e)
    let { alpha, beta, gamma } = event ;
    let e = {
      alpha : Math.round(alpha) ,
      beta  : Math.round(beta)  ,
      gamma : Math.round(gamma) 
    }

    let arr = window.document.getElementById("arrowBox") ; 
    arr.style.transform = `rotateZ(${-e.alpha}deg) rotateX(${e.beta}deg) rotateY(${e.gamma}deg)`;
    setOrientation( e  ) 
  }

  let component_id = 'do.app.viz' 

  let init = async function () { 
    window.tsw = tsw ;
    tsw.apis.sensor.subscribe_to_orientation(component_id, orientation_handler)  ; 
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


  return (


    <Flex direction="column" align="center" justifyContent="space-around" >
      
      <h2 className={styles.title}>   Device Orientation </h2>

      <Flex marginTop="30px"  direction="column" align="center" justifyContent="space-between">

	<Box id="arrowBox" marginBottom="20px">
	  <ArrowUpIcon boxSize={40} />
	</Box>
	
	<p>
	  {orientation.alpha} | {orientation.beta} | {orientation.gamma} 
	</p>
	
      </Flex>

    </Flex>

    
  )

}


export default Component ; 
