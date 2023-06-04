import type { NextPage } from 'next'
import {useEffect} from 'react' ;
import * as firebase from  "../src/firebase"
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

	
      </Flex>
    )
  }


  let LogOutUI = function() {
    return (
      <Flex direction="column">

	<Button onClick={log_out}>
	  Log out
	</Button>
	
      </Flex>
    ) 
  } 


  let log_out = function(){
    const auth = getAuth();
    signOut(auth).then(() => {
      // Sign-out successful.
      log("User signed out") 
    }).catch((error) => {
      // An error happened.
      log("Signout error") 
    });
  } ; 

  
  return (
    <Container height="50%" marginTop="10%" >   { user  ? <LogOutUI/> : <LogInUI/>  }  </Container> 
  )
}

export default Component 
