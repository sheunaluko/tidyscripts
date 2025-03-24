'use client';

import React from 'react';
import {Box,  Typography} from "../src/mui" 
import {
    Show
} from "@chakra-ui/react"


export default function ResponsiveComponent() {

    return (
	<Show above='md'> 
	  <Typography color='primary.main'> 		    
	      Copyright © 2025 Sheun Aluko, MD		
	  </Typography>
	</Show> 
  )
}
