'use client';

import { Fragment} from 'react' ;
import Link from 'next/link' ; 
import { useAuthState } from 'react-firebase-hooks/auth';
//import * as firebase_instance from "../src/firebase" ; 
import * as tsw from "tidyscripts_web"

import {getAuth , onAuthStateChanged } from "firebase/auth"

const {
    log_out 
}  = tsw.apis.firebase

declare var window : any ; 

import {
    Typography 
} from "../src/mui"

import {theme,
	secondary,
	primary,
	grey }  from "../app/theme"


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
    //
    <Button size="sm" onClick={()=>log_out(getAuth() )} 
	    color={primary}
	    colorScheme={secondary}
    >
	Log out
    </Button>
)

const login = (
    <Button size="sm"
	    style={{
		backgroundColor : grey[50] , 
		color : primary 
	    }}
	    onClick={
    function(){
	if (typeof window != "undefined" ) { 
	    window.location.href="/laboratory/login"
	}

    }}>
	Log In
    </Button>

)

export default function Widget(props : any) { 

  const [user, loading, error] = useAuthState(getAuth(), {});

  if (loading) { return spinner }
  if (user ) {return logout } else {
    return login 
  } 
 
}


