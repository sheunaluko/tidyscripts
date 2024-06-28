'use client';


import React from 'react' ; 
import { Button, ButtonGroup,Textarea, Spinner, Box, useToast, useDisclosure, Select, Flex, Icon} from '@chakra-ui/react'
import type {UseToastOptions} from '@chakra-ui/react' 

import * as tsw from "tidyscripts_web"  ; 
const log = tsw.common.logger.get_logger({id:"toast"}) ;

import useInit from "../hooks/useInit" /* custom hook that wraps around useEffect */ 


type ToastArgs = UseToastOptions ;


/* we need to let typescript know that window is a variable that exists, and give it type any so we can access arbitrary fields of the object */
declare var window : any ;



/**
 * Handles logging of a toast event; not the actual UI updates 
 *
 */
export function log_toast(args : ToastArgs) {
  log("New toast =>")
  log(args) 
} 

/**
 * Helper function that can be imported to trigger toasts 
 */
export function toast_toast(args : ToastArgs) {
    if (typeof window != 'undefined') { 
	let evt = new window.CustomEvent('toast', {detail : args })
	window.dispatchEvent(evt)
	log("Request to toast the toast!")
    }
} 


export default function Component(props : any) {

  /* first we import the toast functionality and wrap it into a function */ 
  const toast = useToast() ;
  let do_toast = function (e : any) {
    /* The event is triggered with the following syntax: window.dispatchEvent( new window.CustomEvent('toast', { detail : toast_args }) )  */
    let args = e.detail as ToastArgs
    toast(args) ;
    log_toast(args)
  }
  
  let init = async function() {
    /* this function runs once when the commponent loads in the useEffect scope below */
    /* the main goal of this function is to attach the toast event to window event listener */ 
      /* now we can attach the event handler (see its definition above)  */
      if (typeof window != 'undefined') {       
	  window.addEventListener('toast' , do_toast )
	  log("Added toast event handler to window")
      } 
  }

  let clean_up = async function() {
    /* this function runs once when the commponent is unmounted from the DOM */
    /* the main goal of this function is to detach the toast event to window event listener */
      /* now we can attach the event handler (see its definition above)  */
      if (typeof window != 'undefined') {       
	  window.removeEventListener('toast' , do_toast )
	  log("Removed toast event handler to window")
      } 
  } 


  useInit({init,clean_up}) ; 

  
  return (
    <Box id="toast"> 
    </Box>
  )
} 

