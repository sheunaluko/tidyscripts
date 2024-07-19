'use client';

import React, { useState } from 'react';
import { NextPage } from 'next';
import { useAuthState } from 'react-firebase-hooks/auth';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signInAnonymously, GoogleAuthProvider, signInWithRedirect, signInWithPopup, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { ChakraProvider, Box, Button, Input, Flex, Text } from '@chakra-ui/react';
import {toast_toast} from "../../../components/Toast"

import * as tsw from "tidyscripts_web" 
const log = tsw.common.logger.get_logger({id:"login"})

function login_success() {
    toast_toast({
        title : "Successfully logged in.", 
        description : "",
        duration : 2000,
        status : "success" , 
        isClosable : true , 
    })
} 

function login_error(error : string) {
    toast_toast({
        title : "Failed to log in.", 
        description : error,
        duration : 2000,
        status : "error" , 
        isClosable : true , 
    })
} 

/* define the  Firebase config object  */ 
const firebaseConfig = {
  apiKey: "AIzaSyByjw-kqCpeYXQpApAeUU3GAnh1WfSQd7I",
  authDomain: "tidyscripts.firebaseapp.com",
  projectId: "tidyscripts",
  storageBucket: "tidyscripts.appspot.com",
  messagingSenderId: "292052354057",
  appId: "1:292052354057:web:77fa4743a205deb40764d8",
  measurementId: "G-4SJGBBQWW2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const Login: NextPage = () => {
  const [user, loading, error] = useAuthState(auth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleEmailSignIn = () => {
    signInWithEmailAndPassword(auth, email, password)
      .then(() => {
        login_success();
      })
      .catch((error) => {
        login_error(error.message);
      });
  };

  const handleEmailSignUp = () => {
    createUserWithEmailAndPassword(auth, email, password)
      .then(() => {
        login_success();
      })
      .catch((error) => {
        login_error(error.message);
      });
  };

  const handleAnonymousSignIn = () => {
    signInAnonymously(auth).catch((error) => {
      console.error("Error signing in anonymously", error);
    });
  };

    const handleGoogleSignIn = () => {
	const provider = new GoogleAuthProvider();
	let is_mobile  = tsw.util.is_mobile()
	log(`Google sign in request; mobile=${is_mobile}`)

	if (false) {
	    
	    signInWithRedirect(auth, provider).catch((error) => {
		console.error("Error signing in with Google", error);
		login_error(error.message)
	    })
	    
	} else {

	    signInWithPopup(auth, provider).catch((error) => {
		console.error("Error signing in with Google", error);
		login_error(error.message)
	    })
	    
	} 

    };

  const handleSignOut = () => {
    signOut(auth).catch((error) => {
      console.error("Error signing out", error);
    });
  };

  return (
      <ChakraProvider>
	  <Flex direction="column" align="center" justify="center" minH="100%">
              {loading ? (
		  <Text>Loading...</Text>
              ) : user ? (
		  <Box>
		      <Text>Signed in as {user.email || "Anonymous"}</Text>
		      <Button onClick={handleSignOut} mt={4}>Sign Out</Button>
		  </Box>
              ) : (
		  <Flex direction="column" align="left" justify="center" minH="100%">
		      <Button onClick={handleGoogleSignIn} mb={2}>Sign In with Google</Button>    
		      <Button onClick={handleAnonymousSignIn} mb={2}>Sign In Anonymously</Button>
		      <Button onClick={handleEmailSignIn} mb={2}>Sign In with Email</Button>
		      <Button onClick={handleEmailSignUp} mb={2}>Sign Up with Email</Button>
		      
		      <Input
			  placeholder="Email"
			  value={email}
			  onChange={(e) => setEmail(e.target.value)}
			  mb={2}
		      />
		      <Input
			  placeholder="Password"
			  value={password}
			  onChange={(e) => setPassword(e.target.value)}
			  mb={2}
		      />
		  </Flex>
              )}
	  </Flex>
      </ChakraProvider>
  );
};

export default Login;
