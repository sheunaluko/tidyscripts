'use client';

import type { NextPage } from 'next'
import { ChakraProvider } from '@chakra-ui/react'
import {ReactNode} from 'react'

interface Props {
  children?: ReactNode
  // any props that come into the component
}


export default function Provider({ children } : Props ) {
  return (
    <ChakraProvider>{children}</ChakraProvider>
  );
}

