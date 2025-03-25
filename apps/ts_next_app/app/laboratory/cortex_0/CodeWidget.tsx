'use client';

import React, { useState, useEffect } from 'react';

import AceEditor from "react-ace";

import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/theme-kuroir";
import "ace-builds/src-noconflict/theme-solarized_dark";
import "ace-builds/src-noconflict/ext-language_tools";

import useInit from "../../../hooks/useInit";

import { Box, TextField, Button, Typography } from "@mui/material";
import * as tsw from "tidyscripts_web";

import { ThemeProvider, createTheme } from '@mui/material/styles';

const log    = tsw.common.logger.get_logger({id:"data_editor"});
const debug  = tsw.common.util.debug
const fp     = tsw.common.fp


const CodeEditor = () => {

    let init = async function() {

        if (typeof window !== 'undefined') { 
            Object.assign(window, {
                tsw,
		fp, 
		debug
            });
            log("Code Widget init");
        }
    };

    let clean_up = ()=> { log("code editor unmounted"); };
    useInit({ init , clean_up });  //my wrapper around useEffect

    let init_code_params = {
	code : `console.log("hello universe!")` ,
	mode : `javascript` 
    } 
    

    
    const [code_params, set_code_params] = useState(init_code_params as any); //for coding widget

    useEffect( ()=> {
	log(`initializing with code: ${code_params.code} + mode= ${code_params.mode}`) ; 
    },[])

    let handle_code_change = function(v : string) {
    	set_code_params( { code : v , mode : code_params.mode  } ) 
    }	

    return (
        <Box display="flex" flexDirection="column" height="100%" width="100%">

		<AceEditor
		    mode={code_params.mode}
		    theme="solarized_dark"
		    showPrintMargin={false}
		    name="ace-editor"
		    value={code_params.code}
		    onChange={handle_code_change}
		    editorProps={{ $blockScrolling: true }}
		    setOptions={{
			showLineNumbers: true,
			tabSize: 2,
			// @ts-ignore 
			useWorker : false , 
		    }}
		    fontSize={20}
		    width="100%"
		    height="100%"		    

		/>
		

		<style>
		    {`
          /* Inline CSS to hide scrollbars but still allow scrolling */
          .ace_scrollbar {
            width: 0 !important;
            height: 0 !important;
          }
          .ace_scrollbar-inner {
            display: none !important;
          }
		    `}
		</style>
        </Box>

    );
};

export default CodeEditor;

