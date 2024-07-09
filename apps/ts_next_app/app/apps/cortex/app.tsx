'use client';

import type { NextPage } from 'next'
import {useEffect, useState } from 'react' ;
import React from 'react' ; 
import styles from '../../../styles/Default.module.css'
import * as tsw from "tidyscripts_web"  ;

import { ChakraProvider } from '@chakra-ui/react'

import {
    Box,
    Button,
    Input ,
    Textarea,
} from "@chakra-ui/react" 

/*
import {
    ThemeProvider,
    createTheme,
    Box ,
    Button ,
    Input ,
    TextField,  
} from "../../../src/mui"
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


/**
 * This init function is run in the useEFfect function of the component. 
 * Thus all of the DOM will be loaded at the time this runs 
 * First the bokeh APIs are loaded into the browser
 */
async function init() {
    //initialize the graphs
    await tsw.apis.bokeh.load_bokeh_scripts() ;
    if (! window.Bokeh ) {  return  } 
    // -
    let plot_names = ['plot_tts' , 'plot_mic' , 'plot_mic_zoom', 'plot_events', 'plot_target' ] ;
    window.data_sources = {} ; 
    // -    
    plot_names.map( (x:string) => {
	let el = document.getElementById(x) ;
	let tmp : any; 
	if (x == 'plot_mic_zoom' ) { 
	    tmp = make_plot(null) ;
	} else {
	    tmp = make_plot([-1.1,1.1]) ;
	} 
	let {plot,source} = tmp 
	window.data_sources[x]  = source  ; 
	Bokeh.Plotting.show(plot,el)
    })
    // Initialize the text
    dom.set_value_by_id("text_field",
			"Hello I am Cortex") ;       

    // - 
    Object.assign(window, {
	tsw,
	wa , 
    })
}

/*
 * TODO: 
   - visualize the temp buffer to aid with debugging 
   - consider calculating the amount of seconds in it  
   - the problem is that the "quiet_met" criteria are occuring too fast 
   - its possibly related to the order of functions in handle_data; what if analyze_tmp_buffer is placed first?
   - what if the problem is that there is overlap between the buffers that are inside of the tmp buffer? 
      - like this is because the behavior of getTimeData from the analyzer node is unexpected - I dont fully know the behavior
 */ 

async function on_init_audio() {
    //start streaming microphone data to the mic graph
    log(`Initializing microphone`) ; 
    await wa.initialize_microphone() ;
    wa.register_mic_callback('update_mic_graph'  , function(f32 : Float32Array) {
	let val = dsp.mean_abs(f32 as any) ;
	let t   = window.performance.now()/1000 ;
	let new_data = { x : [t,t] , y : [-val,val] } ;
	window.data_sources['plot_mic'].stream(new_data, 500) ;
	window.data_sources['plot_mic_zoom'].stream(new_data, 500) ; 	
    })

    log(`Initializing sound event detector`) ;
    let ops = {
	threshold : 0.02 , 
	margin : 1000 , 
    }
    let sed = await wa.get_sound_event_detector(ops) ;
    sed.addEventListener( 'sound_event_started' , function() {
	log(`detected event start`) ;
	//debugger; 
    })

    sed.addEventListener( 'sound_event_ended' , async function(e :any) {
	log(`detected event ended`) ;
	let sr = await wa.get_sampling_rate() ; 
	let blob = e.detail ;
	let aud_buf = await wa.decode_audio_blob(blob);
	let f32     = aud_buf.getChannelData(0) ; 
	let new_data = { x : fp.range(0,f32.length).map( (i:any) =>i/sr ) , y : Array.from(f32) } ;
	debug.add('event_data' , new_data) 
	window.data_sources['plot_events'].stream(new_data, f32.length) ;

    })
    

    Object.assign(window, {
	sed 
    })
    
} 


const  Component: NextPage = (props : any) => {

    useEffect(  ()=> {init()} , [] ) ; //init script

    return (
	<ChakraProvider> 

	    <Box style={{ flexDirection : 'column' , display : 'flex'}} >

		<Box > 
		    <h1 className={styles.title}>
			<a href="https://github.com/sheunaluko/tidyscripts">Cortex </a>  
		    </h1>
		</Box>

		<br />
		<Button style={{width:"10%"}}
			onClick={on_init_audio}
			variant="outlined" > Init </Button>

		<Box flexDirection="column" >
		    <p>TTS</p>
		    <Box>
			<Box style={{ display:"flex",
				      flexDirection : "row",
				      justifyContent: "space-between" ,
				      alignItems : "center" }} >
			    <Textarea id='text_field' />
			    <Button variant="outlined" onClick={on_submit}> Submit </Button>
			</Box>
		    </Box> 
		    <br />
		    <Box>
			<p>Source</p>
			<Box id="plot_tts" sx={{flexGrow: 1}} /> 			
		    </Box> 
		    <br />
		    <Box>
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
		    <br />
		    <Box>
			<p>Events</p>
			<Box id="plot_events" sx={{flexGrow: 1}} />
		    </Box> 
		    
		    <br />
		    <Box>
			<p>Target</p>
			<Box id="plot_target" sx={{flexGrow: 1}} />
		    </Box> 

		</Box> 


	    </Box>

	</ChakraProvider>

    )
}

export default Component ; 


async function on_submit() {

    /*
       Next steps: 

       - run turbo build -> if it works then 'git commit' ; if not :( 

       - make use of openai speech recognition API on the event data 
       - implment media_recorder object in the web_audio file (leave the evt_detector one) 
          - enable manual recording , eg 
          - async function record_audio(ms) ; 
              - let promise = new Promise() 
              - media_recorder.ondataavailable = function(data){ promise.resolve(data) }
              - media_recorder.start() ; 
              - setTimeout( ()=> media_recorder.stop() , ms) 
              - return promise 
       
       - move web_audio.ts<dev> back to pkg dir 

       WORKFLOW
       - look at duration of the audio file that is to be played 
       - play the audio file and display it in the top graph 
       - start the middle graph recording for DURATION and then stop  (with a padding parameter)  
       - now we should have two wave forms top and middle 
       - Now write the code that lines up the waveforms to determine the DELAY and the the SCALE parameters using a loss function 
       - Display the target waveform in the 3rd graph, along with the calculated parameters 
       - create "mode" toggle for "adaptive" or "single shot" where the parameters are either iterated over time and applied in real-time 
           - or they are applied with each run only 
           - the above has created single shot already; so will work on adaptive mode at this point 
    */

    //get the text from the text area
    let el = document.getElementById("text_field") as any;
    let txt = el.value ;
    log(`Got text: ${txt}`)
    //get the audio
    let  aud = await tsw.apis.openai.text_to_audio(txt) ;
    let {audio_element,blob} = aud; 
    log(`Got audio data`)
    // - 
    let decoded = await wa.decode_audio_blob(blob) ;
    let duration = decoded.duration ;
    // - 
    let f32 = decoded.getChannelData(0)
    // -
    let sr = await wa.get_sampling_rate() ; 
    let new_data =  {
	y  : Array.from(f32) , 
	x  : tsw.common.fp.range(1,f32.length+1 ).map ( (i:any)=> i/sr)
    } 
    // -  
    debug.add('audio' , aud ) ;
    debug.add('new_data' , new_data  ) ;    
    //get the data source
    let src = window.data_sources['plot_tts']
    src.stream( new_data , f32.length  )
    audio_element.play();  
} 

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

