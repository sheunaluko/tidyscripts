import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { ChakraProvider } from '@chakra-ui/react'
import {useEffect} from 'react' ;
//import * as firebase from  "../src/firebase"
//import * as firebase from "../src/firebase"  

declare var window : any ; 

function MyApp({ Component , pageProps } : AppProps) {

  useEffect( ()=>{
    async function main() {
      //window.firebase = firebase ; 
    }
    main()
  } , []) 
  
  return (
    <ChakraProvider>
      <Component {...pageProps} />
    </ChakraProvider>
  )
}


export default MyApp





