'use client' ;

import type { NextPage } from 'next'
import React,{useEffect} from 'react' ;
import * as firebase from  "../../src/firebase"
import { useAuthState } from 'react-firebase-hooks/auth';
import { getAuth, signOut } from "firebase/auth";
import * as tsw from "tidyscripts_web" 




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



const Component: NextPage = (props : any) => {

  const [user, loading, error] = useAuthState(firebase.auth, {});

  useEffect( ()=>{

    async function main() {
      window.firebase = firebase; 
    }

    main() ;

    
  },[])

  let LogInUI = function() {
    let m = '10px'
    return (
      <Flex direction="column" justifyContent="space-between">
	Welcome to Tidyscripts!


	<Button marginTop={m} marginBottom={m} onClick={firebase.google_sign_in}>
	  Login with Google
	</Button>

	<Button  marginBottom={m}  onClick={firebase.facebook_sign_in}>
	  Login with Facebook
	</Button>

	<Button  marginBottom={m} onClick={firebase.github_sign_in}>
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
	
	<Button onClick={firebase.log_out}>
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
