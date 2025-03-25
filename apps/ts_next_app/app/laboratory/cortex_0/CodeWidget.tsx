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


const CodeEditor = ({code_params, onChange}) => {

    const [localCode, setLocalCode] = useState(code_params.code);

    // Only initialize once
    useEffect(() => {
	setLocalCode(code_params.code);
    }, []); // no dependency on `codeParams` to avoid reset on parent re-render

    const handleChange = (value: string) => {
	setLocalCode(value);
	onChange(value); // updates parent ref, but doesn’t trigger re-renders
    };

    
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



    return (
        <Box display="flex" flexDirection="column" height="100%" width="100%">

	    <AceEditor
		mode={code_params.mode}
		theme="solarized_dark"
		value={localCode}
		onChange={handleChange}
		name="ace-editor"
		fontSize={20}
		width="100%"
		height="100%"
		showPrintMargin={false}
		editorProps={{ $blockScrolling: true }}
		setOptions={{
		    showLineNumbers: true,
		    tabSize: 2,
		    useWorker: false,
		}}
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

