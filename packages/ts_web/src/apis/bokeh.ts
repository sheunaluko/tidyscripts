import * as common from "tidyscripts_common"
import {inject_script} from "../util/index" 

declare var window : any ;
declare var Bokeh : any  ; 

const log = common.logger.get_logger({id : 'bokeh' })

var loading = false; 

/*
 * Loads Bokeh functionality into the window 
 */
export async function load_bokeh_scripts() {
    //first check if they are available 
    if (window.Bokeh) {
	log("Bokeh is already loaded! Skipping load for now...")
	return 
    }

    //or if its loading 
    if (loading) {
	log("Bokeh is already loading! Skipping load for now...")
	return 
    }

    loading = true ; 

    
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
	await inject_script( {src : s , attributes : { "crossorigin" : 'anonymous'}   }) ; 
    } 
    log("Done") 
} 


export function point_plt() {
     // create some data and a ColumnDataSource
    const x = [0]
    const y = [0] 
    const source = new Bokeh.ColumnDataSource({ data: { x: x, y: y } });

    // create some ranges for the plot
    const ydr =  null ;

    let ops : any  = {width: 300, height : 100}; 

    ops.y_range = new Bokeh.Range1d({start : -1 , end : 1 })
    ops.x_range = new Bokeh.Range1d({start : -1 , end : 1 })    
    
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
