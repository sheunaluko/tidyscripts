
import React, { useState, useEffect, useRef } from 'react';
import { Box, TextField, Button, Typography, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import ReactMarkdown from 'react-markdown';

import * as tsw from "tidyscripts_web";
import useInit from "../../../../hooks/useInit";

var open_ai_client : any = null ; 

const log = tsw.common.logger.get_logger({id:"chat"});

const Chat: React.FC = () => {

    let init = async function() {
        /* Assign tidyscripts library to window */
        if (typeof window !== 'undefined') {


            Object.assign(window, {
		tsw, 
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
                        <Typography
                            sx={{
                                padding: '10px',
                                borderRadius: '8px',
                                backgroundColor: message.role === 'assistant' ? 'primary.main' : 'transparent',
                                border: message.role === 'user' ? '1px solid' : 'none',
                                borderColor: message.role === 'user' ? 'secondary.main' : 'transparent',
                                color: message.role === 'assistant' ? 'white' : 'inherit'
                            }}
                        >

				{message.content}

                        </Typography>
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
