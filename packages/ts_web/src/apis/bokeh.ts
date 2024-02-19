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

