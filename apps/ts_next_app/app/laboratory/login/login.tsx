'use client';

import React, { useState } from 'react';
import { NextPage } from 'next';
import { useAuthState } from 'react-firebase-hooks/auth';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signInAnonymously, GoogleAuthProvider, signInWithPopup, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { ChakraProvider, Box, Button, Input, Flex, Text } from '@chakra-ui/react';

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
    signInWithEmailAndPassword(auth, email, password).catch((error) => {
      console.error("Error signing in with email and password", error);
    });
  };

  const handleEmailSignUp = () => {
    createUserWithEmailAndPassword(auth, email, password).catch((error) => {
      console.error("Error signing up with email and password", error);
    });
  };

  const handleAnonymousSignIn = () => {
    signInAnonymously(auth).catch((error) => {
      console.error("Error signing in anonymously", error);
    });
  };

  const handleGoogleSignIn = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).catch((error) => {
      console.error("Error signing in with Google", error);
    });
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
          <Flex direction="column" align="center" justify="center" minH="100%">
            <Button onClick={handleGoogleSignIn} mb={2}>Sign In with Google</Button>    
            <Button onClick={handleAnonymousSignIn} mb={2}>Sign In Anonymously</Button>
            <Input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              mb={2}
            />
            <Input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              mb={2}
            />
            <Button onClick={handleEmailSignIn} mb={2}>Sign In with Email</Button>
            <Button onClick={handleEmailSignUp} mb={2}>Sign Up with Email</Button>
          </Flex>
        )}
        {error && <Text color="red.500">{error.message}</Text>}
      </Flex>
    </ChakraProvider>
  );
};

export default Login;
