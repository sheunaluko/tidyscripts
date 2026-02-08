'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import {
  getAuth,
  signInWithEmailAndPassword,
  signInAnonymously,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Button,
  Input,
  Flex,
  Text,
} from '@chakra-ui/react';
import { toast_toast } from './Toast';

declare var window: any;

/**
 * Global login modal — mounted once in the layout, triggered from anywhere
 * via `window.openLoginModal()`. Supports Google popup, email/password,
 * and anonymous sign-in without navigating away from the current page.
 */
export default function LoginModal() {
  const auth = getAuth();
  const [user, loading] = useAuthState(auth);
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const onClose = useCallback(() => {
    setIsOpen(false);
    setEmail('');
    setPassword('');
  }, []);

  // Expose global opener
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.openLoginModal = () => setIsOpen(true);
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete window.openLoginModal;
      }
    };
  }, []);

  // Auto-close on successful login and notify listeners
  useEffect(() => {
    if (user && isOpen) {
      toast_toast({
        title: 'Successfully logged in.',
        description: '',
        duration: 2000,
        status: 'success',
        isClosable: true,
      });
      onClose();
      // Fire a custom event so any app can react to login
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('loginSuccess'));
      }
    }
  }, [user, isOpen, onClose]);

  function loginError(error: string) {
    toast_toast({
      title: 'Failed to log in.',
      description: error,
      duration: 3000,
      status: 'error',
      isClosable: true,
    });
  }

  const handleGoogleSignIn = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).catch((error) => {
      loginError(error.message);
    });
  };

  const handleEmailSignIn = () => {
    signInWithEmailAndPassword(auth, email, password)
      .then(() => {})
      .catch((error) => loginError(error.message));
  };

  const handleEmailSignUp = () => {
    createUserWithEmailAndPassword(auth, email, password)
      .then(() => {})
      .catch((error) => loginError(error.message));
  };

  const handleAnonymousSignIn = () => {
    signInAnonymously(auth).catch((error) => {
      loginError(error.message);
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="sm">
      <ModalOverlay />
      <ModalContent bg="gray.800" color="white">
        <ModalHeader>Log In</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <Flex direction="column" gap="12px">
            <Button onClick={handleGoogleSignIn} colorScheme="blue" size="md">
              Sign In with Google
            </Button>

            <Flex direction="column" align="center" gap="2px">
              <Button onClick={handleAnonymousSignIn} variant="ghost" size="sm" color="gray.400">
                Sign In Anonymously
              </Button>
              <Text fontSize="xs" color="gray.500">No device sync</Text>
            </Flex>

            <Text fontSize="sm" color="gray.400" mt={1}>
              Or use email:
            </Text>
            <Input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              size="sm"
            />
            <Input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              size="sm"
            />
            <Flex gap="8px">
              <Button onClick={handleEmailSignIn} size="sm" flex={1}>
                Sign In
              </Button>
              <Button onClick={handleEmailSignUp} size="sm" flex={1} variant="ghost" color="gray.400">
                Sign Up
              </Button>
            </Flex>
          </Flex>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
