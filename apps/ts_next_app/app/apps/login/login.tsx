'use client' ;

import type { NextPage } from 'next'
import React,{useEffect} from 'react' ;
import { useAuthState } from 'react-firebase-hooks/auth';
import * as firebase_instance from "../../../src/firebase" ; 
import * as tsw from "tidyscripts_web" 

const {
    GoogleAuthProvider ,
    signInWithRedirect, 
    log_out 
}  = tsw.apis.firebase 


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
  Flex , 
  Card,
  Container,
  Spinner, 
} from "@chakra-ui/react";

declare var window : any ;

const log = tsw.common.logger.get_logger({id:'login'})


/* configure providers */
const GoogleProvider = new GoogleAuthProvider() ;
function google_sign_in() {signInWithRedirect(firebase_instance.get_auth(), GoogleProvider) }


/* component */ 
const Component: NextPage = (props : any) => {

  const [user, loading, error] = useAuthState(firebase_instance.auth, {});

  useEffect( ()=>{

      
    async function main() {
        if (typeof window != "undefined" ) { 
	    window.firebase = tsw.apis.firebase;
	    window.firebase_instance = firebase_instance; 	    
          }
    } 

    main() ;

    
  },[])

  let not_working = function() {
    window.alert("Sorry! This type of login is not working yet, please login with Google") ; 
  }
  
  let LogInUI = function() {
    let m = '10px'
    return (
      <Flex direction="column" justifyContent="space-between">
	<div>Welcome to Tidyscripts! </div>


	<Button marginTop={m} marginBottom={m} onClick={google_sign_in}>
	  Login with Google
	</Button>

	<Button  marginBottom={m}  onClick={not_working}>
	  Login with Facebook
	</Button>

	<Button  marginBottom={m} onClick={not_working}>
	  Login with Github
	</Button>

	<Button  onClick={function(){window.location ="/" }}>
	  Home
	</Button>
	
      </Flex>
    )
  }


  let LogOutUI = function() {
    return (
      <Flex direction="column">

	<Button onClick={function(){window.location="/" }}>
	  Home
	</Button>
	
	<Button onClick={()=>log_out(firebase_instance.auth)}>
	  Log out
	</Button>
	
      </Flex>
    ) 
  } 


  var spinner = ( <Spinner style={{}}
			   thickness='1px'
			   speed='0.65s'
			   emptyColor='gray.200'
			   color='blue.500'
			   size='xl' 	/> )


  let LoadingOrLogin = function(){
    return (
      <React.Fragment>
      { loading ? spinner : <LogInUI/>}
      </React.Fragment> 
    ) 
  } 
  
  return (
    <>   { user  ? <LogOutUI/> : <LoadingOrLogin />  }  </> 
  )
}

export default Component 
