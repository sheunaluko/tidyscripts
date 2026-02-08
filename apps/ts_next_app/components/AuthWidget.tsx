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
    Typography ,
    Button ,
    Box 
} from "../src/mui"

import {theme,
	secondary,
	primary,
	grey }  from "../app/theme"


import {
  Spinner
} from "@chakra-ui/react";


const spinner = ( <Spinner style={{marginLeft : '9px'}}
			 thickness='1px'
			 speed='0.65s'
			   emptyColor='gray.200'
			 color='blue.500'
			   size='xs' 	/> )

const logout = (
    //
    <Button size="small" onClick={()=>log_out(getAuth() )}

	        style={{
	backgroundColor : 'background.paper' , 
	color : 'primary.main' 
    }}
    >
	Log out
    </Button>
)

const login = (
    <Button size="small"
	    style={{
		backgroundColor : 'background.paper' ,
		color : 'primary.main'
	    }}
	    onClick={
    function(){
	if (typeof window != "undefined" && window.openLoginModal) {
	    window.openLoginModal();
	} else {
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


