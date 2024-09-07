
import React, { useState, useEffect, useRef } from 'react';
import { Box, TextField, Button, Typography, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { alpha } from '@mui/system';

import ReactMarkdown from 'react-markdown';
import { theme } from "../../../theme";


import * as tsw from "tidyscripts_web";
import useInit from "../../../../hooks/useInit";

const debug = tsw.common.util.debug; 

export async function chat_completion_handler(args : any) {
    /*
       Take the args and pass it to the vercel function instead 
     */
    let url = "/api/open_ai_chat_2"
    let fetch_response = await fetch(url, {
	method : 'POST' ,
	headers: {   'Content-Type': 'application/json'   },
	body : JSON.stringify(args)
    });
    debug.add("fetch_response" , fetch_response) ;
    let response = await fetch_response.json() ;
    debug.add("response" , response) ;
    return response 
} 


export var open_ai_client = {
    chat : {
	completions : {
	    create : chat_completion_handler
	} 
    } 
} 

const log = tsw.common.logger.get_logger({id:"chat"});

const Chat: React.FC = () => {

    let init = async function() {
        /* Assign tidyscripts library to window */
        if (typeof window !== 'undefined') {

            Object.assign(window, {
		open_ai_client ,
		
            });
	    
            log("Chat init");
        }
    };

    let clean_up = () => { log("chat unmounted") };
    useInit({ init, clean_up });

    const [messages, setMessages] = useState<{ role: string, content: string }[]>([]);
    const [input, setInput] = useState<string>('');
    const [model, setModel] = useState<string>('gpt-4o');
    const [systemMessage, setSystemMessage] = useState<string>('');    

    const chatDisplayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatDisplayRef.current) {
            chatDisplayRef.current.scrollTop = chatDisplayRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (input.trim()) {
            const newMessages = [...messages, { role: 'user', content: input }];
            setMessages(newMessages);
            const completion = await chat_completion(model , systemMessage, newMessages);
            setMessages([...newMessages, { role: 'assistant', content: completion }]);
            setInput('');
        }
    };

    const chat_completion = async (model: string, systemMessage: string, messages: { role: string, content: string }[]) => {

	log("getting completions")
	let msgs = [
            { role: "system", content: systemMessage },
            ...messages
        ];
	console.log(msgs) 
	
        const response = await open_ai_client.chat.completions.create({
            model: model,
            messages: msgs, 
        });
        return response.choices[0].message.content;
    };

    const handleKeyPress = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleSend();
        }
    };


    let alpha_val = 0.4
    let light_primary = alpha(theme.palette.primary.main, alpha_val) 
    let light_secondary = alpha(theme.palette.secondary.main, alpha_val) 

    return (
        <Box sx={{ padding: '20px', border: '1px solid', borderColor: 'primary.main', borderRadius: '8px' }}>
            <Typography variant="h6" gutterBottom>
                Chat
            </Typography>
            <Accordion style={{marginBottom : "10px" }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Configuration</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <TextField
                        fullWidth
                        variant="outlined"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder="Model (default: gpt-4o)"
                        sx={{ marginBottom: '10px' }}
                    />
                    <TextField
                        fullWidth
                        variant="outlined"
                        value={systemMessage}
                        onChange={(e) => setSystemMessage(e.target.value)}
                        placeholder="System Message"
                        sx={{ marginBottom: '10px' }}
                    />
                </AccordionDetails>
            </Accordion>
            <Box id="chat_display" ref={chatDisplayRef} sx={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '20px' }}>


                {messages.map((message, index) => (
                    <Box
                        key={index}
                        sx={{
                            display: 'flex',
                            justifyContent: message.role === 'user' ? 'flex-start' : 'flex-end',
                            marginBottom: '10px'
                        }}
                    >
			<Box
			                                sx={{
                                padding: '30px',
                                borderRadius: '8px',
				backgroundColor: message.role === 'assistant' ? light_primary : light_secondary,							    
                                border: message.role === 'user' ? '1px solid' : '1px solid',
                                borderColor: message.role === 'user' ? 'secondary.main' : 'primary.main',
                                color: message.role === 'assistant' ? 'inherit' : 'inherit'
                            }}

			>
			<ReactMarkdown>
                            {message.content}
			</ReactMarkdown>
			</Box>

                    </Box>
                ))}
            </Box>
            <TextField
                fullWidth
                variant="outlined"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message"
                sx={{ marginBottom: '10px' }}
            />
            <Button variant="contained" color="primary" onClick={handleSend}>
                Send
            </Button>
        </Box>
    );
};

export default Chat;
