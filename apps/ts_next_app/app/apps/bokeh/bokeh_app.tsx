'use client';

import type { NextPage } from 'next'
import {useEffect, useState } from 'react' ;
import React from 'react' ; 
import styles from '../../../styles/Default.module.css'

import * as tsw from "tidyscripts_web"  ;
const log = tsw.common.logger.get_logger({id:"bokeh_app"}) ; 

import {
    ThemeProvider,
    defaultTheme,
    Box ,
    Button 
} from "../../../src/mui" 

declare var window : any ;


export async function load_bokeh_scripts() {
    //first check if they are available
    if (window.Bokeh) {
	log("Bokeh is already loaded! Skipping load for now...")
	return 
    }
    //if not we use the utility function to load the scripts
    let bokeh_version = "3.0.0" ; 
    let scripts = [
	`https://cdn.bokeh.org/bokeh/release/bokeh-${bokeh_version}.min.js`,
	`https://cdn.bokeh.org/bokeh/release/bokeh-widgets-${bokeh_version}.min.js`,
	`https://cdn.bokeh.org/bokeh/release/bokeh-tables-${bokeh_version}.min.js`, 
	`https://cdn.bokeh.org/bokeh/release/bokeh-api-${bokeh_version}.min.js`, 
	`https://cdn.bokeh.org/bokeh/release/bokeh-gl-${bokeh_version}.min.js`,
	`https://cdn.bokeh.org/bokeh/release/bokeh-mathjax-${bokeh_version}.min.js`, 
    ] ;
    log("Loading scripts")
    // see https://docs.bokeh.org/en/2.4.1/docs/first_steps/installation.html#install-bokehjs
    for (var s of scripts) { 
	log(`Loading ${s}`) ; 
	await tsw.util.inject_script( {src : s , attributes : { "crossorigin" : 'anonymous'}   }) ; 
    } 
    log("Done") 
} 


function make_sin_plot() {


    let el = document.getElementById("bokeh_plot")
    let { offsetWidth : width , offsetHeight : height  }  = el ; 
    
    // create some data and a ColumnDataSource
    const x = Bokeh.LinAlg.linspace(-0.5, 20.5, 100);
    const y = x.map(function (v) { return 5 * Math.sin(v)  +10   });
    const source = new Bokeh.ColumnDataSource({ data: { x: x, y: y } });

    // create some ranges for the plot
    const xdr = new Bokeh.Range1d({ start: -0.5, end: 20.5 });
    const ydr = new Bokeh.Range1d({ start: -0.5, end: 20.5 });

    // make the plot
    const plot = new Bokeh.Plot({
	title: "BokehJS Plot",
	x_range: xdr,
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

function make_pie_plot() {

    let el = document.getElementById("bokeh_plot")
    let { offsetWidth : width , offsetHeight : height  }  = el ; 

    const pie_data = {
	labels: ['Work', 'Eat', 'Commute', 'Sport', 'Watch TV', 'Sleep'],
	values: [8, 2, 2, 4, 0, 8],
    };

    const p1 = Bokeh.Charts.pie(pie_data , {width , height } );

    return p1 
} 


async function main(t : string) {
    await load_bokeh_scripts() ;
    //await tsw.common.asnc.wait(1000);
    var p = null ;
    switch (t) {
	case 'pie' :
	    p = make_pie_plot()
	    break ;
	case 'sin' :
	    p = make_sin_plot()
	    break ; 
    }

    var el = document.querySelector("#bokeh_plot .bk-Plot")
    if (el) {
	document.getElementById("bokeh_plot").removeChild(el) ;
    }
    Bokeh.Plotting.show(p,document.getElementById("bokeh_plot"))

} 

/**
 * This init function is run in the useEFfect function of the component. 
 * Thus all of the DOM will be loaded at the time this runs 
 */
async function init() {
    
    Object.assign(window, {
	tsw , load_bokeh_scripts, main , 
    })

}


const Component: NextPage = (props : any) => {

    useEffect(  ()=> {init()} , [] ) ; //init script

    return (
	<ThemeProvider theme={defaultTheme}>
	    <Box sx={{ flexGrow : 1,  width : "80%", flexDirection : 'column' , display : 'flex', justifyContent : 'space-between'}} >

		<Box > 
		    <h1 className={styles.title}>
			<a href="https://github.com/sheunaluko/tidyscripts">Graphing </a> Interface 
		    </h1>
		</Box>

		<br />
		<Box sx={{justifyContent : 'center' , display : 'flex' , flexDirection : 'row' , gap : "14px" }}>
		    <Button onClick={()=>main("sin")} size="small" variant="outlined"> Sin Wave </Button>
		    <Button onClick={()=>main("pie") } size="small" variant="outlined"> Pie Chart </Button>		    
		</Box>
		<br /> 

		<Box id="bokeh_plot" sx={{flexGrow: 1}} /> 

	    </Box>
	</ThemeProvider> 

    )
}

export default Component



