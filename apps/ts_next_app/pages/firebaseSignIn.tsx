import type { NextPage } from 'next'
import {useEffect} from 'react' ;
import * as firebase from  "../src/firebase"

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

const Component: NextPage = (props : any) => {

  useEffect( ()=>{

    async function main() {
      window.firebase = firebase; 
    }

    main() ;

    
  },[])

  

  return (
    <Container>
    <Flex direction="column">
      Sign in page!

      <Button onClick={firebase.google_sign_in}>
	Sign in with google...
      </Button>
      
    </Flex>
    </Container> 
  )
}

export default Component 
