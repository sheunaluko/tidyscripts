
import  * as api from "./api"



/**
 * Creates a time series plot given x values and y values 
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

