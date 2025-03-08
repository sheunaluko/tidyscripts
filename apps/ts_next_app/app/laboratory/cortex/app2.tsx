'use client';
import type { NextPage } from 'next'
import {useEffect, useState } from 'react' ;
import React from 'react' ; 
import styles from '../../../styles/Default.module.css'
import * as tsw from "tidyscripts_web"  ;
import { ChakraProvider } from '@chakra-ui/react' ;
import VC from "./voice_chat" ; 
import { alpha } from '@mui/system';
import { theme } from "../../theme";
import ReactMarkdown from 'react-markdown';

import {
    Box,
    Button,
    Input ,
    Switch,
    FormGroup,
    FormControlLabel,
    Typography, 
    Slider 
} from "@mui/material"

declare var window : any ;
declare var Bokeh : any  ; 

const log   = tsw.common.logger.get_logger({id:"cortex"}) ;
const ap    = tsw.util.audio_processing;
const dsp   = tsw.common.util.dsp ;
const debug = tsw.common.util.debug ;
const fp    = tsw.common.fp ;
const dom   = tsw.util.dom ; 
const wa    = tsw.apis.web_audio;
const oai   = tsw.apis.openai;
const sounds = tsw.util.sounds

/* 
   PARAMS 
 */
const viz_n = 50 ;
const viz_s = 0.03 ; 
var   sound_feedback = true 

//for the chat box 
const alpha_val = 0.4
const light_primary = alpha(theme.palette.primary.main, alpha_val) 
const light_secondary = alpha(theme.palette.secondary.main, alpha_val) 

var plots_initialized = false
var GLOBAL_PAUSE      = false

async function init() {

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
	    tmp = point_plt() ;
	    
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

    //first do general audio init;  
    await init()  ; 
    //start streaming microphone data to the mic graph
    log(`Initializing microphone`) ; 
    await wa.initialize_microphone() ;

    /*
    wa.register_mic_callback('update_mic_graph'  , function(f32 : Float32Array) {
	let val = dsp.mean_abs(f32 as any) ;
	let t   = window.performance.now()/1000 ;
	let new_data = { x : [t,t] , y : [-val,val] } ;

	// - turn off mic updating 
	if (false) { 
	    window.data_sources['plot_mic'].stream(new_data, 500) ;
	    window.data_sources['plot_mic_zoom'].stream(new_data, 500) ;
	}
    })
    */

    wa.register_mic_callback('update_viz'  , function(f32 : Float32Array) {
	if (! GLOBAL_PAUSE ) { 
	    let val = dsp.mean_abs(f32 as any) ;
	    let new_data = x_y_gaussian(viz_n, val+viz_s, val+viz_s) ; 
	    window.data_sources['viz'].stream(new_data, viz_n) ;
	} 
    })

    log(`Initializing sound event detector`) ;
    let ops = {
	threshold : 0.02 , 
	margin : 1000 , 
    }
    let sed = await wa.get_sound_event_detector(ops) ;
    sed.addEventListener( 'sound_event_started' , function() {
	log(`detected event start`) ;
	//if there is audio currently playing we should pause it
	
    })

    sed.addEventListener( 'sound_event_ended' , async function(e :any) {
	log(`detected event ended`) ;
	
	if (GLOBAL_PAUSE) {
	    log(`detected pause; returning`) ;
	    return 
	}
	
	let sr = await wa.get_sampling_rate() ; 
	let blob = e.detail ;

	/*
	   blob is the sound event in blob form, which can be passed to the openai.sendAudioBlobToOpenAI(blob: Blob) function to get a transcription 
	 */

	try { 
	    
	    let aud_buf = await wa.decode_audio_blob(blob);
	    let f32     = aud_buf.getChannelData(0) ; 
	    let new_data = { x : fp.range(0,f32.length).map( (i:any) =>i/sr ) , y : Array.from(f32) }
	    debug.add('event_data' , new_data)
	    debug.add('raw_sound_event' , e) ;
	    //dont display the detected events 
	    //window.data_sources['plot_events'].stream(new_data, f32.length) ;	


	    if (transcribeRef.current) {
		log(`Transcribing audio`)
		let transcript  = await oai.sendAudioBlobToOpenAI(blob) ;
		debug.add("transcript" , transcript) ;
		log(`Sound event transcription: ${transcript}`)
		await transcription_cb(transcript)  
	    } else {
		log(`NOT Transcribing audio`)
	    } 

	} catch (e : any) {
	    log(`error with event transcription: ${e}`) 
	} 
	
    })
    

    Object.assign(window, {
	sed 
    })
    
} 


const  Component: NextPage = (props : any) => {



    const [transcribe, setTranscribe] = useState(true)
    const transcribeRef = React.useRef(transcribe) //toggle for enabling transcription

    let init_chat_history = [
	{role : 'system' , content : 'You are an AI voice agent, and as such your responses should be concise and to the point and allow the user to request more if needed, especially because long responses create a delay for audio generation. Do not ask if I want further details or more information at the end of your response!'} 
    ] 

    const [started, set_started] = useState(false);    
    const [chat_history, set_chat_history] = useState(init_chat_history);
    const [audio_history, set_audio_history] = useState([]);    
    const [ai_model, set_ai_model] = useState("gpt-4o-mini-2024-07-18");
    const [playbackRate, setPlaybackRate] = useState(1.0)


    
    const chatDisplayRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatDisplayRef.current) {
            chatDisplayRef.current.scrollTop = chatDisplayRef.current.scrollHeight;
        }
    }, [chat_history]);


    //handle audio playback rate 
    const handleRateChange = (event: Event, newValue: number | number[]) => {
	if (Array.isArray(newValue)) return; // Handle single value only
	setPlaybackRate(newValue);
    }

    // Function to add a user's message to the chat
    const add_user_message = (content: string) => {
	// @ts-ignore
	set_chat_history((prev) => [...prev, { role: "user", content }])
	if (sound_feedback) { 
	    sounds.proceed()
	} 
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(  ()=> {
	//determine if it is user_message or ai_message
	if (chat_history.length < 1)  {
	    log(`Chat history empty`); return 
	}
	let role = fp.last(chat_history).role
	log(`Detected change in chat history from: ${role}`)
	if (role == 'user') {
	    
	    log(`Given user change, will send to ai`)
	    get_ai_response().then( (resp : string) => add_ai_message(resp) )
	    
	}  else {
	    log(`Given ai change, will await user response `) 
	} 
	
    }, [chat_history])

    // Function to add an AI's message to the chat
    const add_ai_message = async (content: string) => {
	// @ts-ignore
	set_chat_history((prev) => [...prev, { role: "assistant", content }]);
	if (sound_feedback) { 
	    sounds.proceed()
	} 

	//here we need to actually speak the response too!
	log(`generating audio response...`)
	let args = {
	    model: "tts-1",
	    voice: "shimmer",
	    input : content   
	}
	let  { audio_element , blob }  = await oai.text_to_audio(args)
	log(`done`)
	log(`Setting audio element playbackRate to ${playbackRate}`)
	audio_element.playbackRate = playbackRate ; 
	audio_element.play() //play the audio
	//and save it
	// @ts-ignore	
	set_audio_history((prev) => [...prev,  audio_element   ]);
	/*
	   Because the audio element is appended to the array, when the user interrupts the ai then the last audio element can 
	   be found and paused. Makes me think of keywords, etc.. its paused on sound detected, but if the word pause is detected then 
	   it simply pauses and can resume, etc.. 
	 */ 
    };

    //function for getting AI response from the chat history and the ai_model
    let get_ai_response = async function() {
	log(`Calling llm`) 
	// - 
	let args = {
	    model : ai_model ,
	    messages : chat_history ,
	}
	// -
	debug.add('ai_args', args) 
	let web_response =  await oai.proxied_chat_completion(args)
	debug.add('ai_response' , web_response)
	try  {
	    var response_text = web_response.choices[0].message.content 
	} catch (e : any) { 
	    throw new Error(`Error extracting ai message: ${e}`) 
	}

	debug.add('ai_response_text' , response_text)
	return response_text 

    } 

    //in the transcription callback we get the transcription text and call add_user_message
    //then we call ai_response = await get_ai_response()

    let transcription_cb = async function(text : string) {
	log(`tcb: ${text}`)
	add_user_message(text) ;
    } 


    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(  ()=> {
	Object.assign(window, {
	    tsw,
	    wa ,
	    debug ,
	    get_ai_response 
	}) ; 

    } , [] ) ; //init script is called in "on_init_audio"    
    
    React.useEffect( ()=> {
	transcribeRef.current = transcribe 
    }, [transcribe] )

    const handleSwitch = (event: React.ChangeEvent<HTMLInputElement>) => {
	let v = event.target.checked
	log(`Transcribe=${v}`)
	setTranscribe(v);
    };
    

    return (
	<ChakraProvider> 

	    <Box style={{ flexDirection : 'column' , display : 'flex' , alignItems : 'center' , minWidth : '40%'}} >

		<Box display='flex' flexDirection='row' alignItems='center' >
		    <Box>
			<h1 className={styles.title}>
			    <a href="https://github.com/sheunaluko/tidyscripts">Cortex </a>  
			</h1>
		    </Box>

		    <Box> 
			<Button variant='outlined' style={{width:"10%" , marginLeft : '25px' , marginTop : '11px'}}
					 onClick={function() {
					     if (!started) {
						 log(`Started audio`)
						 set_started(true) ;
						 if (!plots_initialized) { 
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
		    <Box display='flex' flexDirection='row' justifyContent='center' width="100%">
			<Box id="viz" />
		    </Box> 

		    {/*

		    <br />
		    <Box display='flex' flexDirection='row' justifyContent='center' width="100%">
			<p>Mic</p>			 
			<Box style={{display:'flex' , flexDirection : 'row'}}>
			    <Box>
				<Box id="plot_mic" sx={{flexGrow: 1}} /> 			
			    </Box>
			    <Box>
				<Box id="plot_mic_zoom" sx={{flexGrow: 1}} /> 			
			    </Box>
			    
			</Box>
		    </Box>

		    */}
		    <br />


		    <Box display='flex' flexDirection='row' justifyContent='center' width="100%">

			<Box id="chat_display" ref={chatDisplayRef} sx={{ maxWidth : "500px" , maxHeight: '200px', overflowY: 'auto', marginBottom: '20px' }}>


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


		    </Box> 

		    
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




		</Box>

		


	    </Box>

	</ChakraProvider>

    )
}

export default Component ; 



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




export function point_plt() {
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
