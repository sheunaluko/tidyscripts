'use client';
import type { NextPage } from 'next'
import {useEffect, useState, useRef } from 'react' ;
import React from 'react' ; 
import styles from '../../../styles/Default.module.css'
import * as tsw from "tidyscripts_web"  ;
//import { ChakraProvider } from '@chakra-ui/react' ;
import { alpha } from '@mui/system';
import { theme } from "../../theme";
import ReactMarkdown from 'react-markdown';
import * as cortex_agent from "./cortex_agent_web" 
import Grid from '@mui/material/Grid2';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { styled, useTheme } from '@mui/material/styles';
import {ObjectInspector } from 'react-inspector';
import {
    Box,
    Button,
    Input ,
    Switch,
    FormGroup,
    FormControlLabel,
    TextField,
    Accordion,
    AccordionSummary,
    AccordionDetails, 
    Typography, 
    Slider,
    Paper ,
    IconButton 
} from "@mui/material"


import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import WidgetItem from "./WidgetItem" ;

import * as cortex_utils from "./src/cortex_utils" 


import Code_Widget from "./CodeWidget" 

/*

   Main Feature Release of Cortex
   Currently working on integratinng Workspace Functionality  

 */

declare var window : any ;
declare var Bokeh : any  ; 

const log   = tsw.common.logger.get_logger({id:"cortex"}) ;
const ap    = tsw.util.audio_processing;
const dsp   = tsw.common.util.dsp ;
const debug = tsw.common.util.debug ;
const fp    = tsw.common.fp ;
const dom   = tsw.util.dom ; 
const wa    = tsw.apis.web_audio;
const vi    = tsw.util.voice_interface ; 
const oai   = tsw.apis.openai;
const sounds = tsw.util.sounds


/* For the chat box */ 
const alpha_val = 0.4
const light_primary = alpha(theme.palette.primary.main, alpha_val) 
const light_secondary = alpha(theme.palette.secondary.main, alpha_val) 

/* Get the agent */ 
const COR = cortex_agent.get_agent() ;

/* grid item */ 
const Item = styled(Paper)(({ theme }) => ({
    backgroundColor: '#fff',
    ...theme.typography.body2,
    padding: theme.spacing(1),

    overflowY : 'hidden' ,
    overflowX : 'auto' ,     
    height : "300px" ,
    ...theme.applyStyles('dark', {
	backgroundColor: '#1A2027',
    })
})) 


/* C O M P O N E N T _ D E F I N I T I O N  */ 
const  Component: NextPage = (props : any) => {

    const theme = useTheme() ; 
    
    const [transcribe, setTranscribe] = useState(true)
    const transcribeRef = React.useRef(transcribe) //toggle for enabling transcription

    let init_chat_history = [
	{role : 'system' , content : 'You are an AI voice agent, and as such your responses should be concise and to the point and allow the user to request more if needed, especially because long responses create a delay for audio generation. Do not ask if I want further details or more information at the end of your response!'} 
    ]

    const default_model = "gpt-4o"
    /* const default_model = "gpt-4o-mini-2024-07-18" */ 

    const [started, set_started] = useState(false);    
    const [chat_history, set_chat_history] = useState(init_chat_history);
    const [last_ai_message, set_last_ai_message] = useState("" as string);
    const last_ai_message_ref = React.useRef(last_ai_message) 
    
    const [transcription_similarity_threshold, set_transcription_similarity_threshold] = useState(0.7);
    const [interim_result, set_interim_result] = useState("" as string);            

    const init_thoughts : string[] = []  ; 
    const [thought_history, set_thought_history] = useState(init_thoughts);

    const init_logs : string[] = []  ;     
    const [log_history, set_log_history] = useState(init_logs);    
    
    const [audio_history, set_audio_history] = useState([]);
    const [ai_model, set_ai_model] = useState(default_model);    
    const [playbackRate, setPlaybackRate] = useState(1.2)
    const [workspace, set_workspace] = useState({}) ;
    const [text_input, set_text_input] = useState<string>('');

    let init_code_params_ = {
	code : `console.log("hello universe!")` ,
	mode : `javascript` 
    }

    let init_code_params =   {
	code : "import asyncio\nimport websockets\n\nasync def echo(websocket, path):\n    async for message in websocket:\n        await websocket.send(message)\n\nasync def main():\n    async with websockets.serve(echo, \"localhost\", 8765):\n        await asyncio.Future()  # run forever\n\nasyncio.run(main())" , 
	mode : "python"
    }
    
    //const [code_params, set_code_params] = useState(init_code_params as any); //for coding widget


    const codeParamsRef = useRef(init_code_params);

    /* 
    useEffect( ()=> {
	log(`initializing with code: ${code_params.code} + mode= ${code_params.mode}`) ; 
    },[])
    */

    let handle_code_change = function(code_params : any) {
	codeParamsRef.current.code = code_params.code ;
	codeParamsRef.current.mode = code_params.mode ; 
    	//set_code_params( { code : v , mode : code_params.mode  } ) 
    }	
    

    
    const [focusedWidget, setFocusedWidget] = useState<string | null>(null);
    /* E V E N T _ H A N D L I N G */
    const handle_thought = (evt : any) => {
	let {thought} = evt ; 
	log(`Got thought event: ${thought}`)
	set_thought_history((prev) => [...prev, thought])	    
    }

    const handle_log = (evt : any) => {
	log(`Got log event: ${evt.log}`)
	set_log_history((prev) => [...prev, evt.log])	    
    }
    
    const handle_workspace_update = (evt : any) => {
	log(`Got workspace update event`)
	let new_workspace = structuredClone(window.workspace) ; 
	set_workspace( { ...new_workspace }) ; 
    }

    const handle_code_update = (evt : any) => {
	log(`Got code update event`)
	log(evt) 
	handle_code_change(evt.code_params) ; 
    }

    
    const event_dic  : {[k:string] : any}  = {
	'thought' : handle_thought ,
	'workspace_update' : handle_workspace_update,
	'log' : handle_log ,
	'code_update' : handle_code_update , 
    }
    
    const handle_event = (evt : any) => {
	log(`Got event: ${JSON.stringify(evt)}`)
	let fn = event_dic[evt.type] ;
	fn(evt) 
    }

    /* L I S T E N E R */

    if (typeof window !== "undefined" ) { 
	window.addEventListener( 'tidyscripts_web_speech_recognition_interim' , async (e: any) => {
	    let transcript = e.detail ;
	    set_interim_result(transcript) ; 
	})
    }

    
    /* E F F E C T S */ 

    useEffect( ()=> {
	let speak = async function(content : string) {
	    await  vi.speak_with_rate(content, playbackRate) ;
	}
	COR.configure_user_output(speak) 
    }, [playbackRate])


    useEffect( ()=> {
	COR.on('event', handle_event)
	return () => { COR.off('event' , handle_event) } 
    }, [])


    useEffect(() => {
	const ids = ['chat_display', 'log_display', 'thought_display'];

	requestAnimationFrame(() => {
	    ids.forEach((id) => {
		const el = document.getElementById(id);
		if (el) {
		    el.scrollTop = el.scrollHeight;
		}
	    });
	});
    }, [chat_history, thought_history, log_history, last_ai_message, transcribe, playbackRate, focusedWidget, interim_result]);    

    useEffect(  ()=> {

	if (window.workspace ) {
	    window.alert(`Caution, overwriting workspace global var`) ;
	}
	
	Object.assign(window, {
	    tsw,
	    wa ,
	    debug ,
	    get_ai_response ,
	    COR ,
	    transcription_cb ,
	    workspace : {} ,
	    last_ai_message,
	    last_ai_message_ref, 
	}) ;

	return ()=>{
	    let k = `cortex_workspace_${(new Date()).toString()}` ; 
	    localStorage[k] = JSON.stringify(window.workspace) ; 
	    delete window.workspace 
	}

    } , [] ) ; //init script is called in "on_init_audio"    

    useEffect( ()=> {
	transcribeRef.current = transcribe 
    }, [transcribe] )

    useEffect( ()=> {
	last_ai_message_ref.current = last_ai_message
    }, [last_ai_message] )


    useEffect( ()=> {
	//log(`Interim result: ${interim_result}`)
	//compare the interim result to last ai message to determine if we should stop...

	
	if (interim_result.includes("stop") ) {
	    log(`Detected stop word in the interim results`);

	    //if the AI is NOT talking then we should NOT stop (since its just the user talking)
	    if (! vi.tts.tts().speaking) {
		log(`However the AI is not talking so will ignore`) 
		return 
	    }

	    
	    if (last_ai_message.includes("stop")){
		log(`However the AI also said stop so... ignoring`)
	    } else {
		log(`AND the AI did not say stop so assuming it is the user`) ;

		
		vi.tts.cancel_speech() ; 
		vi.pause_recognition();
		add_user_message(`I no longer wanted to listen to your output and so I interrupted your speech with the keyword "stop" at the following location in your output: ${interim_result}. Do not respond until I prompt you again`) ; 
		
		
	    }
	    
	}

	
    }, [interim_result])
    
    useEffect(  ()=> {
	//determine if it is user_message or ai_message
	if (chat_history.length < 1)  {
	    log(`Chat history empty`); return 
	}
	let role = fp.last(chat_history).role
	log(`Detected change in chat history from: ${role}`)

	if (role == 'user') {

	    log(`Given user change, will send to ai`)
	    get_ai_response().then( (resp : string) => {
		if (resp == null) {
		    log("IGNORING NULL RESPONSE")
		} else { 
		    add_ai_message(resp)
		}
	    })

	    return 

	}
	if (role == 'system') {
	    log(`System change ignored`) 
	} else {
	    log(`Given ai change, will await user response `) 
	} 

    }, [chat_history])

    /*
       DEFINE THE TRANSCRIPTION CALLBACK
       This is passed to the audio api and will be called once transcription results  
       in the transcription callback we get the transcription text and call add_user_message
       then we call ai_response = await get_ai_response()
     */


    let transcription_cb = (async function(text : string , ) {

	log(`tcb: ${text}`)	

	/*
	   The system may have detected its own output, so we check for that
	   This is only the case though if vi.listen_while_speaking == true //continues listening 
	 */

	if (vi.listen_while_speaking) {
	    log(`Listening while speaking, so will check...`)

	    let sim  = cortex_utils.string_similarity(text.trim() , last_ai_message_ref.current) ;

	    if (sim > transcription_similarity_threshold ) {
		log(`Detected similarity (${sim}) > threshold (${transcription_similarity_threshold})`)
		log(`Thus will ignore it :)`)
		return 
	    }

	    if (text.trim().toLowerCase().includes("stop") && !last_ai_message_ref.current.toLowerCase().includes("stop") )  {
		log(`Detected unique "stop" inside transcription`)

		if (! vi.tts.tts().speaking) {
		    log(`AI is speaking`) 
		    vi.tts.cancel_speech()
		    vi.pause_recognition();
		    add_user_message(`I no longer wanted to listen to your output and so I interrupted your speech with the keyword "stop". Do not respond until I prompt you again`) 

		    
		    return ; 
		}

	    }

	}


	/*
           This is where I need to pass the transcript Dynamically either to: 
	   - cortex_channel 
	   - function_channel 

	   If a function is executing then we pass to function_channel 
	   If not then we pass to cortex_channel 

	 */

	if (COR.is_running_function) {
	    log(`tcb: Cortex running function, will forward`)
	    await COR.handle_function_input(text)
	    
	} else { 
	    log(`tcb: No active cortex function`) 
	    add_user_message(text) ;
	}
	
    }) ; 

    //handle user chat message (instead of voice)
    const handleSend = async () => {
	if (text_input.trim()) {
	    //simulate as if the user has said this
	    transcription_cb(text_input.trim())
	}
    };

    //if the user pressers enter instead of send
    const handleKeyPress = (event: React.KeyboardEvent) => {
	if (event.key === 'Enter') {
	    event.preventDefault();
	    handleSend();
	    //set text_input to ""
	    set_text_input("") ; 

	}
    };

    //handle audio playback rate 
    const handleRateChange = (event: Event, newValue: number | number[]) => {
	if (Array.isArray(newValue)) return; // Handle single value only
	setPlaybackRate(newValue);
    }

    // Function to add a user's message to the chat
    const add_user_message = (content: string) => {
	// @ts-ignore
	set_chat_history((prev) => [...prev, { role: "user", content }])

	//add the user message to COR
	COR.add_user_text_input(content) 


	if (sound_feedback) { 
	    sounds.proceed()
	} 
    };


    // Function to add an AI's message to the chat
    const add_ai_message = async (content: string) => {
	// @ts-ignore
	set_chat_history((prev) => [...prev, { role: "assistant", content }]);
	if (sound_feedback) { 
	    sounds.proceed()
	} 

	set_last_ai_message(content) ;

	
	//here we need to actually speak the response too!
	log(`generating audio response...`)
	log(`Using playbackRate to ${playbackRate}`)	
	await vi.speak_with_rate(content, playbackRate) ;
	log(`done`)


    };

    //function for getting AI response from the chat history and the ai_model
    let get_ai_response = async function() {
	log(`Calling llm`)
	var ai_response_text : string ; 
	try  {
	    var ai_response_text = await COR.run_llm(5) ; 
	} catch (e : any) { 
	    throw new Error(`Error extracting ai message: ${e}`) 
	}

	debug.add('ai_response_text' , ai_response_text)
	log(`Got response: ${ai_response_text}`) 
	return ai_response_text 

    } 

    const handleSwitch = (event: React.ChangeEvent<HTMLInputElement>) => {
	let v = event.target.checked
	log(`Transcribe=${v}`)
	setTranscribe(v);
    };

    /* define widgets */


    let widget_scroll_styles = {
	overflowY: 'auto',
	maxHeight: '95%' ,
	scrollbarWidth: 'none',         // Firefox
	'&::-webkit-scrollbar': {
	    display: 'none',              // Chrome, Safari
	}
    }

    
    const ThoughtsWidget = ({ fullscreen = false, onFocus, onClose }: any) => (
	<WidgetItem
	title="Thoughts"
	fullscreen={fullscreen}
	onFocus={onFocus}
	onClose={onClose}
	>
	<Box id="thought_display" sx={widget_scroll_styles} >	    
	    {
		thought_history.map( (thought,index) => (
		    <Box
			key={index}
			    sx={{
				borderRadius: '8px',
				//border:  '1px solid' , 
				color: 'success.light' 
			    }} 
		    >
			{thought} 
		    </Box>

		    
		))
		
	    }
	</Box> 
	</WidgetItem>
    ) ; 


    const LogWidget = ({ fullscreen = false, onFocus, onClose }: any) => (
	<WidgetItem
	title="Log"
	fullscreen={fullscreen}
	onFocus={onFocus}
	onClose={onClose}
	>
	<Box id="log_display" sx={widget_scroll_styles} >	    
	    {
		log_history.map( (log,index) => (
		    <Box
			key={index}
			    sx={{
				borderRadius: '8px',
				//border:  '1px solid' , 
				color: (log.indexOf('ERROR') > -1 ) ?  'error.light' : 'info.light'  , 
			    }} 
		    >
			{log} 
		    </Box>

		    
		))
		
	    }
	</Box> 
	</WidgetItem>
    ) ; 

    
    const WorkspaceWidget = ({ fullscreen = false, onFocus, onClose }: any) => (
	<WidgetItem
	title="Workspace"
	fullscreen={fullscreen}
	onFocus={onFocus}
	onClose={onClose}
	>

	<Box id="workspace_display" sx={widget_scroll_styles} >	    
	    <ObjectInspector style={{width: "90%"  , marginTop : "10px" }}
			     theme={theme.palette.mode == "dark" ? "chromeDark" : "chromeLight" }
			     data={workspace} expandPaths={['$', '$.*','$.*.*']} />
	</Box> 

	</WidgetItem>
    )

    const ChatWidget = ({ fullscreen = false, onFocus, onClose }: any) => (
	<WidgetItem
	title="Chat"
	fullscreen={fullscreen}
	onFocus={onFocus}
	onClose={onClose}
	>
	<Box id="chat_display" sx={widget_scroll_styles} >

	    {chat_history.slice(1).map((message, index) => (
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
			    padding: '8px',
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
	</WidgetItem>

    )



    const CodeWidget = ({ fullscreen = false, onFocus, onClose }: any) => (
	<WidgetItem
	title="Code"
	fullscreen={fullscreen}
	onFocus={onFocus}
	onClose={onClose}
	>
	    <Box id="code_display" sx={  {

		overflowY: 'auto',
		height : "95%" ,

	scrollbarWidth: 'none',         // Firefox
	'&::-webkit-scrollbar': {
	    display: 'none',              // Chrome, Safari
	}

		
	    } } >
	    <Code_Widget code_params={codeParamsRef.current} onChange={handle_code_change}  /> 
	</Box> 
	</WidgetItem>

    )

    
    
    return (

	<Box style={{ height : "100%", flexDirection : 'column' , display : 'flex' , alignItems : 'center' , minWidth : '90%'}} >

	<Box display='flex' flexDirection='row' alignItems='center' >
	    <Box>
		<h1 className={styles.title}>
		    <a href="https://github.com/sheunaluko/tidyscripts">Cortex </a>  
		</h1>
	    </Box>

	    <Box> 
		<Button variant='outlined' style={{width:"10%" , borderRadius : "20px", marginLeft : '25px' , marginTop : '11px'}}
			onClick={function() {
			    if (!started) {
				log(`Starting audio`)
				set_started(true) ;
				if (!plots_initialized) {
				    console.log(theme) 
				    init_graph(theme.palette.background.default) 
				    on_init_audio(transcribeRef, transcription_cb )
				} else {
				    GLOBAL_PAUSE = false 						     
				} 
			    } else {
				//already started; so now we stop it
				log(`Stopping audio`)
				GLOBAL_PAUSE = true 
				set_started(false) 
			    } 
			}
			}
		> {started ? "Stop" : "Start"} </Button>
	    </Box> 


	</Box>

	<br />



	<Box flexDirection="column" display='flex' alignItems='start'  width="100%">

	<Box display='flex' flexDirection='row' justifyContent='center' width="100%"  >
	    <Box id="viz" />
	</Box>

	<br />


	{ !focusedWidget && (
	      <Grid width="100%" height="100%" container spacing={2}>

		  <Grid size={{ xs: 12, md: 6 }}>
		      <ChatWidget onFocus={() => setFocusedWidget('chat')} />

		  </Grid>

		  <Grid size={{ xs: 12, md: 6 }}>
		      <WorkspaceWidget onFocus={() => setFocusedWidget('workspace')} />
		  </Grid>
		  

		  <Grid size={{ xs: 12, md: 6 }}>

		      <ThoughtsWidget onFocus={() => setFocusedWidget('thoughts')} />
		  </Grid>
		  
		  <Grid size={{ xs: 12, md: 6 }}>
		      <LogWidget onFocus={() => setFocusedWidget('log')} />
		  </Grid>

		  <Grid size={{ xs: 12, md: 6 }}>
		      <CodeWidget onFocus={() => setFocusedWidget('code')} />
		  </Grid>
		  
		  
	      </Grid> ) 
	} 

	


	</Box>

	<Box style={{flexGrow : 1 , width  : "100%"  }}>

	    	{focusedWidget === 'chat' && <ChatWidget fullscreen onClose={() => setFocusedWidget(null)} />}
	{focusedWidget === 'workspace' && <WorkspaceWidget fullscreen onClose={() => setFocusedWidget(null)} />}
	{focusedWidget === 'thoughts' && <ThoughtsWidget fullscreen onClose={() => setFocusedWidget(null)} />}
	    {focusedWidget === 'log' && <LogWidget fullscreen onClose={() => setFocusedWidget(null)} />}
	    {focusedWidget === 'code' && <CodeWidget fullscreen onClose={() => setFocusedWidget(null)} />}	    



	</Box>


	<Box style={{width : "60%" }}>
	    <Accordion style={{ marginTop: "15px" , marginBottom : '5px'  }}>
		<AccordionSummary expandIcon={<ExpandMoreIcon />}>
		    <Typography>Tools</Typography>
		</AccordionSummary>
		<AccordionDetails>

		    <Box style={{display:'flex' , justifyContent : 'center' }}> 

			<TextField
			    variant="outlined"
			    value={text_input}
			    onChange={(e) => set_text_input(e.target.value)}
			    onKeyPress={handleKeyPress}
			    placeholder="Input text and press enter to submit"
			    sx={{ marginBottom: '5px', marginTop: '5px', width : "100%" }}
			/>



		    </Box>
		    
		    <Box display='flex' flexDirection='row' justifyContent='center' width="100%">
			<FormGroup>
			    <FormControlLabel control={
				<Switch
				    size='small'
				    checked={transcribe}
				    onChange={handleSwitch}
				    inputProps={{ 'aria-label': 'controlled' }}
				/>
			    } label="Listen" />
			</FormGroup>

		    </Box>


		    <Box display='flex' flexDirection='row' justifyContent='center' width="100%" alignItems='center'>


			<Box width="20%"> 
			    <Slider

				size='small'
				value={playbackRate}
				min={0.5}
				max={2.0}
				step={0.1}
				onChange={handleRateChange}
				valueLabelDisplay="auto"
				sx={{ marginTop: '8px' }}
			    />
			</Box>

			<Box 				sx={{ marginLeft : '7px'  }}
			>
			    <Typography >{`Speech Rate: ${playbackRate.toFixed(1)}x`}</Typography>
			</Box> 


			<IconButton onClick={
			function() {
			    if (vi.tts.tts().speaking) { 
				vi.tts.cancel_speech() ; 
				vi.pause_recognition();
				add_user_message(`I no longer wanted to listen to your output and so I interrupted your speech with the keyword "stop". Do not respond until I prompt you again`) ;
			    }

			} 
			}>
			    <PauseCircleOutlineIcon />
			</IconButton>



		    </Box>



		</AccordionDetails>
	    </Accordion>



	</Box>





	</Box>


    )
}

export default Component ; 



var plots_initialized = false
var GLOBAL_PAUSE      = false

async function init_graph(bgc : string) {

    //initialize the graphs
    await tsw.apis.bokeh.load_bokeh_scripts() ;
    if (! window.Bokeh ) {  return  } 
    // -
    let plot_names = ['viz' ] // , 'plot_mic' , 'plot_mic_zoom' ] 
    window.data_sources = {} ; 
    // -    
    plot_names.map( (x:string) => {
	let el = document.getElementById(x) ;
	let tmp : any; 
	if (x == 'plot_mic_zoom' ) { 
	    tmp = make_plot(null) ;

	} else if ( x == 'viz'  ) {
	    tmp = point_plt(bgc) ;

	} else 	{
	    tmp = make_plot([-1.1,1.1]) ;
	} ;

	let {plot,source} = tmp
	plot.toolbar.logo = null ; 
	window.data_sources[x]  = source  ; 
	Bokeh.Plotting.show(plot,el)
    })

    plots_initialized = true 
}


async function on_init_audio( transcribeRef : any  , transcription_cb : any) {

    //start streaming microphone data to the mic graph
    log(`Initializing microphone`) ; 
    await wa.initialize_microphone() ;

    //register graph callback 
    wa.register_mic_callback('update_viz'  , function(f32 : Float32Array) {
	if (! GLOBAL_PAUSE ) { 
	    let val = dsp.mean_abs(f32 as any) ;
	    let new_data = x_y_gaussian(viz_n, val+viz_s, val+viz_s) ; 
	    window.data_sources['viz'].stream(new_data, viz_n) ;
	} 
    })

    //register mic callback
    await vi.initialize_recognition() ;

    window.addEventListener( 'tidyscripts_web_speech_recognition_result' , async (e: any) => {
	let transcript = e.detail ;
	log(`Transcribe Ref: ${transcribeRef.current}`) ;


	if (transcribeRef.current) {
	    log(`Transcribing audio`)
	    debug.add("transcript" , transcript) ;
	    log(`Sound event transcription: ${transcript}`)
	    await transcription_cb(transcript)  
	} else {
	    log(`NOT Transcribing audio`)
	} 
    })


    

} 

/* Params  */
const viz_n = 50 ;
const viz_s = 0.03 ; 
var   sound_feedback = true 



function make_plot(yr : any) {
    // create some data and a ColumnDataSource
    const x = [0]
    const y = [0] 
    const source = new Bokeh.ColumnDataSource({ data: { x: x, y: y } });

    // create some ranges for the plot
    const ydr =  yr ? new Bokeh.Range1d({ start: yr[0], end: yr[1]}) : null ;

    let ops : any  = {width: 300, height : 100}; 
    if (yr) { ops.y_range = ydr } 

    const plot = new Bokeh.Plot(ops); 

    // add axes to the plot
    const xaxis = new Bokeh.LinearAxis({ axis_line_color: null });
    const yaxis = new Bokeh.LinearAxis({ axis_line_color: null });
    plot.add_layout(xaxis, "below");
    plot.add_layout(yaxis, "left");

    // add grids to the plot
    const xgrid = new Bokeh.Grid({ ticker: xaxis.ticker, dimension: 0 });
    const ygrid = new Bokeh.Grid({ ticker: yaxis.ticker, dimension: 1 });
    plot.add_layout(xgrid);
    plot.add_layout(ygrid);

    // add a Line glyph
    const line = new Bokeh.Line({
	x: { field: "x" },
	y: { field: "y" },
	line_color: "#666699",
	line_width: 2
    });
    plot.add_glyph(line, source);


    return {plot , source} 

}




export function point_plt(bgc : string) {
    // create some data and a ColumnDataSource
    const x = [0]
    const y = [0] 
    const source = new Bokeh.ColumnDataSource({ data: { x: x, y: y } });

    // create some ranges for the plot
    const ydr =  null ;

    let ops : any  = {width: 300, height : 100, outline_line_color : null }; 

    ops.y_range = new Bokeh.Range1d({start : -1 , end : 1 })
    ops.x_range = new Bokeh.Range1d({start : -1 , end : 1 })    

    const plot = new Bokeh.Plot(ops);
    plot.background_fill_color=bgc
    plot.border_fill_color=bgc

    plot.toolbar.logo = null
    plot.toolbar_location = null

    // add axes to the plot
    const xaxis = new Bokeh.LinearAxis({ axis_line_color: null });
    const yaxis = new Bokeh.LinearAxis({ axis_line_color: null });
    //plot.add_layout(xaxis, "below");
    //plot.add_layout(yaxis, "left");

    // add grids to the plot
    const xgrid = new Bokeh.Grid({ ticker: xaxis.ticker, dimension: 0 });
    const ygrid = new Bokeh.Grid({ ticker: yaxis.ticker, dimension: 1 });
    //plot.add_layout(xgrid);
    //plot.add_layout(ygrid);

    // add  glyph
    const g = new Bokeh.Circle({
	x: { field: "x" },
	y: { field: "y" },
	line_color: "#34eb49",
	//line_width: 2
    });
    plot.add_glyph(g, source);


    return {plot , source} 
} 


function x_y_gaussian(n: number, sigma_x: number, sigma_y: number): { x: number[], y: number[] } {
    const x: number[] = [];
    const y: number[] = [];

    for (let i = 0; i < n; i++) {
	// Generate two uniform random numbers between 0 and 1
	const u1 = Math.random();
	const u2 = Math.random();

	// Use Box-Muller transform to obtain two independent standard normal random numbers
	const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
	const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);

	// Scale by the specified standard deviations
	x.push(z0 * sigma_x);
	y.push(z1 * sigma_y);
    }

    return { x, y };
}


/*
   let test_chat = [{"role":"user","content":"Hi, how are you today?"},{"role":"assistant","content":"I'm great, thank you! How about you?"},{"role":"user","content":"I'm doing well, thanks for asking."},{"role":"assistant","content":"Glad to hear that. Anything exciting happening today?"},{"role":"user","content":"Not much, just working on some projects."},{"role":"assistant","content":"Sounds productive. Need any help with them?"},{"role":"user","content":"Not right now, but I appreciate it."},{"role":"assistant","content":"Anytime! Just let me know."},{"role":"user","content":"What do you recommend to take a break?"},{"role":"assistant","content":"Maybe a short walk or a quick meditation session?"}]

   init_chat_history = [...init_chat_history, ...test_chat ] ;
 */
