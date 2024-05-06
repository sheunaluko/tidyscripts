'use client';


import { Fragment} from 'react' ;
import Link from 'next/link' ; 

import { useAuthState } from 'react-firebase-hooks/auth';
import { getAuth, signOut } from "firebase/auth";
import * as firebase from  "../src/firebase"

declare var window : any ; 

import {
  Box,
  Button,
  Spinner
} from "@chakra-ui/react";


const spinner = ( <Spinner style={{}}
			 thickness='1px'
			 speed='0.65s'
			 emptyColor='gray.200'
			 color='blue.500'
			   size='xs' 	/> )

const logout = (
    <Button size="sm" onClick={firebase.log_out}>
	Log out 
    </Button>
)

const login = (
    <Button size="sm" onClick={
    function(){
	if (typeof window != "undefined" ) { 
	    window.location.href="/login"
	}

    }}>
	Log In
    </Button>

)

export default function Widget(props : any) { 

  const [user, loading, error] = useAuthState(firebase.auth, {});

  if (loading) { return spinner }
  if (user ) {return logout } else {
    return login 
  } 
 
}


