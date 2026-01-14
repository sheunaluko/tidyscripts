'use client';

import React, { useState, useEffect } from 'react';

import { Box, TextField, Button, Typography } from "@mui/material";
import * as tsw from "tidyscripts_web";

import { ThemeProvider, createTheme } from '@mui/material/styles';

const log    = tsw.common.logger.get_logger({id:"html"});
const debug  = tsw.common.util.debug
const fp     = tsw.common.fp



const HTMLWidget = ({to_display   } : any) => {

     useEffect( () => {
	 log(`updating html widget`)
	 let el = (document.getElementById("HTMLWIDGET") as any)
	 if (el) {
	     el.innerHTML = to_display ;
	     log(`set inner html`)
	 }
     }, [to_display]) 

    return (
        <Box id='HTMLWIDGET' display="flex" flexDirection="column" height="100%" width="100%">
        </Box>

    );
};

export default HTMLWidget;

