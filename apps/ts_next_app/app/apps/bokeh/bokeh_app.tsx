'use client';

import type { NextPage } from 'next'
import {useEffect, useState } from 'react' ;
import React from 'react' ; 
import styles from '../../../styles/Default.module.css'


import * as tsw from "tidyscripts_web"  ;
const log = tsw.common.logger.get_logger({id:"bokeh_app"}) ;
const bokeh = tsw.apis.bokeh  ; 

const ap = tsw.util.audio_processing;  

import {
    ThemeProvider,
    createTheme,
    Box ,
    Button, 
    Container, 
} from "../../../src/mui" 

declare var window : any ;
declare var Bokeh : any  ; 

const dsp = tsw.common.util.dsp ;
const debug = tsw.common.util.debug ; 

function make_sin_plot() {

    let el = document.getElementById("bokeh_plot")
    let { offsetWidth : width , offsetHeight : height  }  = (el as HTMLElement) ; 
    
    // create some data and a ColumnDataSource
    const x = Bokeh.LinAlg.linspace(-0.5, 20.5, 100);
    const y = x.map(function (v : any) { return 5 * Math.sin(v)  +10   });
    const source = new Bokeh.ColumnDataSource({ data: { x: x, y: y } });

    // create some ranges for the plot
    //const xdr = new Bokeh.Range1d({ start: -0.5, end: 20.5 });
    const ydr = new Bokeh.Range1d({ start: -0.5, end: 20.5 });

    // make the plot
    const plot = new Bokeh.Plot({
	title: "BokehJS Plot",
	//x_range: xdr,
	y_range: ydr,
	width , 
	height , 
	//sizing_mode : "scale_height" , 
    });

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

    
    return plot 

}


function make_stream_plot() {

    let el = document.getElementById("bokeh_plot")
    let { offsetWidth : width , offsetHeight : height  }  = (el as HTMLElement) ;

    // create some data and a ColumnDataSource
    const x = [0] 
    const y = x.map(function (v : any) { return 0.1* Math.sin(v)  }); 
    const source = new Bokeh.ColumnDataSource({ data: { x: x, y: y } });

    // make the plot
    const plot = new Bokeh.Plot({
	title: "BokehJS Plot",
	//x_range: xdr,
	//y_range: ydr,
	width , 
	height , 
	//sizing_mode : "scale_height" , 
    });

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

    /*
       AUDIO PROCESSING 
     */

    
    ap.mic.connect(
	function(buf : any) {
	    let pow = dsp.power(buf)
	    debug.add("mic_info" , { pow, buf }  )  ;
	    return {pow,buf} ; 
	} , 
	'tidyscripts_web_mic'
    ) 

    let sr = ap.mic.audio_primitives.mic_sample_rate ;
    log(`Detected sample rate: ${sr}`) ; 
    
    let update_bokeh = function(e : any)  {

	let {pow,buf}  = e.detail ;
	
	let t = window.performance.now() ;
	let secs = t/1000; 

	let new_data = {
	    x : [secs,secs], 
	    y : [pow, -pow] 
	} ;

	//console.log(new_data) ;
	
	source.stream(new_data, 1000) ; 
    }

    window.addEventListener('tidyscripts_web_mic' , update_bokeh)  ;

    /* 

       See ./notes file 
     */
    
    return plot 

}


function make_media_recorder_plot() {

    let el = document.getElementById("bokeh_plot")
    let { offsetWidth : width , offsetHeight : height  }  = (el as HTMLElement) ;

    // create some data and a ColumnDataSource
    let N = 1000 ; 
    const x = [0] //tsw.common.fp.range(0,N) ; 
    const y = [0] // x.map(function (v : any) { return Math.sin(v) }); 
    const source = new Bokeh.ColumnDataSource({ data: { x: x, y: y } });

    //assign the source to window object for reference
    window.source = source // :)
    //and debug as well
    window.debug = tsw.common.util.debug
    
    //utility for getting last x value
    let get_last_x_value = function() {
	let buffer_len = source.data.x.length
	let index = buffer_len -1
	let sample_val = source.data.x[index]
	return sample_val 
    }

    window.get_last_x_value = get_last_x_value ; 

    // make the plot
    const plot = new Bokeh.Plot({
	title: "BokehJS Plot",
	width , 
	height ,
	//y_range: ydr,
    });

    // add axes to the plot
    const xaxis = new Bokeh.LinearAxis({ axis_line_color: null });
    const yaxis = new Bokeh.LinearAxis({ axis_line_color: null });
    plot.add_layout(xaxis, "below");
    plot.add_layout(yaxis, "left");

    // add grids to the plot
    const xgrid = new Bokeh.Grid({ ticker: xaxis.ticker, dimension: 0 });
    const ygrid = new Bokeh.Grid({ ticker: yaxis.ticker, dimension: 1 });
    //plot.add_layout(xgrid);
    //plot.add_layout(ygrid);

    // add a Line glyph
    const line = new Bokeh.Line({
	x: { field: "x" },
	y: { field: "y" },
	line_color: "#666699",
	line_width: 2
    });
    plot.add_glyph(line, source);

    /*
       AUDIO PROCESSING  
       {
       TODO: 
       - maybe media recorder is too high level ->> just go back to using LOW LEVEL WEB AUDIO API 
       - understand blob (the media recorder is returning blobs with 964 size, webm/opus "type" 
       - ? what blob does the old API return  
       - I want to get media recorder to look like old API 
     */


    let t_start_seconds = window.performance.now() / 1000 ; 

    let f_all_samples = async function(data : any, SR : number) { 
	//data is a Float32Array and SR is the Sample rate 
	debug.add('data', data) ;

	let last_sample_num = get_last_x_value() ;
	debug.add('last_sample_num' , last_sample_num ) ; 

	//now i have to create a x_array from this last_sample_num
	let x = [ ];
	let y = [ ];
	for (var i =0 ; i < data.length ; i ++ ) {
	    x.push(last_sample_num + (i/SR)  ) 
	    y.push(data[i] ) 
	} 

	let new_data = {x,y} ; 

	debug.add('new_data' , new_data ) ; 
	source.stream(new_data, 100000) ; 
    }


    let f_dsp = async function(data : any, SR : number) { 
	//data is a Float32Array and SR is the Sample rate 
	debug.add('data', data) ;

	let last_sample_num = get_last_x_value() ;
	debug.add('last_sample_num' , last_sample_num ) ; 


	let sec = window.performance.now()/1000
	let pow = dsp.power(data)
	
	let x = [ sec, sec ];
	let y = [ pow , -pow  ];

	let new_data = {x,y} ; 

	debug.add('new_data' , new_data ) ; 
	source.stream(new_data, 1000) ;
	
    }
    
    start_microphone_stream(f_dsp);  
    
    
    return plot 

}




function make_pie_plot() {

    let el = document.getElementById("bokeh_plot")
    let { offsetWidth : width , offsetHeight : height  }  = (el as HTMLElement)  ; 

    const pie_data = {
	labels: ['Work', 'Eat', 'Commute', 'Sport', 'Watch TV', 'Sleep'],
	values: [8, 2, 2, 4, 0, 8],
    };

    const p1 = Bokeh.Charts.pie(pie_data , {width , height } );

    return p1 
} 


async function main(t : string) {
    await bokeh.load_bokeh_scripts() ;
    //await tsw.common.asnc.wait(1000);
    var p = null ;
    switch (t) {
	case 'pie' :
	    p = make_pie_plot()
	    break ;
	case 'sin' :
	    p = make_sin_plot()
	    break ;
	case 'stream' :
	    p = make_stream_plot()
	    break ; 
	case 'streamMedia' :
	    p = make_media_recorder_plot()
	    break ; 
	    
    }

    var el = document.querySelector("#bokeh_plot .bk-Plot")
    if (el) {
	// @ts-ignore 
	document.getElementById("bokeh_plot").removeChild(el as HTMLElement) ;
    }
    Bokeh.Plotting.show(p,document.getElementById("bokeh_plot"))

} 

/**
 * This init function is run in the useEFfect function of the component. 
 * Thus all of the DOM will be loaded at the time this runs 
 */
async function init() {
    
    Object.assign(window, {
	tsw , main 
    })


}


const Component: NextPage = (props : any) => {

    useEffect(  ()=> {init()} , [] ) ; //init script

    return (
	<ThemeProvider theme={createTheme()}>

	    <div> 
		Hellow
	    </div> 

	    
	</ThemeProvider> 

    )
}

export default Component


async function start_microphone_stream(f : any) {

    let audioCtx = new AudioContext();
    let stream = await navigator.mediaDevices.getUserMedia({audio:true}) ;

    let SR = stream.getAudioTracks()[0].getSettings().sampleRate

    log(`Sample rate of mic track: ${SR}`)

    const source = audioCtx.createMediaStreamSource(stream);

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);

    source.connect(analyser);

    update();

    function update() {
	requestAnimationFrame(update);
	analyser.getFloatTimeDomainData(dataArray);
	debug.add('stream_data' , dataArray ) ;
	// update the time series data
	f(dataArray, SR ); 
	
    }

    Object.assign(window , { stream })

}
