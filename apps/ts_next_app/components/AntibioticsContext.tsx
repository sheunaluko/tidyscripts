'use client' ;

import React from 'react'

interface State { 
    state : any, 
    setState : any 
} 

const MyContext = React.createContext<State>({state: null, setState : null})  ; 

export default MyContext; 
