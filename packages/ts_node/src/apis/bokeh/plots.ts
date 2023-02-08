
import  * as api from "./api"



/**
 * Creates a time series plot given x values and y values 
 * Note that the x values should be unix timestamp in ms. 
 * ```
 * //for example
 * //assuming data represents a mongodb aggregation result by year
 * let t     = data.map(x=> (new Date(x.year,0,1)).getTime() ) ; 
 * let count = data.map(x=>x.count) ; 
 * let ts    = require("tidyscripts_node") ; 
 * //to use bokeh api you need to first initialize it 
 * let i     = ts.apis.bokeh.api.get_interface() ; 
 * //now you need to connect to the websocket server which is hosted on port 9001 by default
 * //then you can graph 
 * ts.apis.bokeh.plots.time_series( t, count ) ; 
 * 
 * //Note: I plan to simplify this process in the future, for more automated plotting
 * ```
 * 
 */
export function time_series(x : any,y : any) {
    let data = {x,y }
    let source_id = 'time_series' ;
    let plot_id = 'time_series' ;
    let fields = ['x', 'y']  ;
    let title = 'Time series' ;
    let tools = "pan,wheel_zoom,box_zoom,reset,save" ;
    let height = 300 ;
    let width  = 300 ; 
    let sizing_mode = "stretch_both" ; 
    let plot_type =  "line"  ; 
    api.new_plot({
	data, source_id, fields, title,  tools, height, width , sizing_mode, plot_type,
	plot_id, plot_options : null , figure_options : {x_axis_type : "datetime"} , 
    })
    
} 

/**
 * Creates a bar chart from specified data. 
 * Data is an array of arrays, of the format shown below: 
 * ``` 
 * var test_bar_data = [
 *   ["Fruit" , "Value" ] ,
 *   ["Apple" , 1 ] , 
 *   ["Banana" , 2] ,
 *   ["Pear" , 1 ] , 
 * ]
 * ```
 */
export function bar_chart(data : any) {
    let source_id = 'bar_chart' ;
    api.bar_plot({
	data, source_id 
    })
    
} 


export var test_bar_data = [
    ["Fruit" , "Value" ] ,
    ["Apple" , 1 ] , 
    ["Banana" , 2] ,
    ["Pear" , 1 ] , 
    ["Algo" , 2] , 
    ["Bond" , 1 ] , 
    ["Test" , 12] , 
]

