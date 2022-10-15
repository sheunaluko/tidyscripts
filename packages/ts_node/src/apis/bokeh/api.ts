/* 
   A nodejs interface to Bokeh plotting 
   Uses a websocket server to relay plotting instructions to a browser window 
*/
import { WebSocketServer } from 'ws';
import express from 'express'

import * as node from "../../index"
import * as common from "tidyscripts_common" 

const log = common.logger.get_logger({id :"bokeh"}) ;




var path = node.io.path ; 


var last_port = 9000 ; 

var _interface : any  = null ; 

/**
 * 
 */
export function get_interface() {

    console.log("Need to fix that html route! app.get(/)"); process.exit(1) ; 
    
    if (_interface ) { return _interface  }  

    let port = last_port++ ; 
    let wss = new WebSocketServer({ port  });
    var client : any  = null ; 

    var client_resolver  : any = null; 
    var client_connected = new Promise( (resolve,reject) => {
	client_resolver = resolve ; 
    })

    var obj : any = { client , ws_port : port, wss , client_connected} 

    wss.on('connection', function connection(ws : any) {
	log(`Client connected`) 
	//assign the client 
	obj.client = ws   ;
	//resolve the promise
	client_resolver(true) ; 
	ws.on('message', function message(data : string) {
	    // - ignore messages from the client -- this is one way communication 
	});
    });

    log(`Bokeh WSS listening on port ${port}`)


    //now start the web server
    const app = express();
    port = last_port ++ 

    app.get('/', function(req :any, res : any) {
	let fname = path.join(path.dirname("").replace("file:",""), '/assets/bokeh.html')
	//log(fname)
	res.sendFile(fname);
    });

    app.listen(port);
    log('Bokeh TSA Server started at http://localhost:' + port);

    obj.app = app ;
    obj.server_port = port ;

    _interface = obj ; 
    
    return obj 
    
} 

interface PlotParams {
    data : any ,
    source_id : string,
    fields : string[] ,
    title : string,
    tools : string,
    height? : number,
    width? : number,
    sizing_mode : string,
    plot_type : string,
    plot_id : string,
    plot_options : any ,
    figure_options : any , 
} 

export function new_plot(params : PlotParams ) {
    
    let {
	data ,
	source_id ,
	fields ,
	title ,
	tools ,
	height ,
	width ,
	sizing_mode ,
	plot_type ,
	plot_id ,
	figure_options, 
	plot_options     } = params ;

    //first we register the data
    let data_registration_ops = {
	'type' : 'register_data'  ,
	id : source_id , 
	data : data 
    }
    _interface.client.send(JSON.stringify(data_registration_ops))

    //and then we send the plot options
    let plot_ops  =  {
	type : "new_plot" , 
	fields ,
	title , 
	tools , 
	height, 
	width , 
	sizing_mode, 
	source_id, 
	plot_type, 
	plot_id , 
	plot_options ,
	figure_options, 
    }     
    _interface.client.send(JSON.stringify(plot_ops))     
    
}



interface AddPlotParams {
    title? : string, 
    tools? : string, 
    height? : number,
    width? : number, 
    sizing_mode? : string, 
    data : any ,
    source_id  : string,
    plot_type : string ,
    plot_id : string,
    fields : string[]  ,
    plot_options : any 	
} 


export function add_plot(params : AddPlotParams ) {
    
    let {
	data ,
	source_id ,
	plot_type ,
	plot_id,
	fields ,
	plot_options ,	
    } = params ;

    //first we register the data
    let data_registration_ops = {
	'type' : 'register_data'  ,
	id : source_id , 
	data : data 
    }
    _interface.client.send(JSON.stringify(data_registration_ops))

    //and then we send the plot options
    let plot_ops  =  {
	type : "add_plot" , 
	fields ,
	source_id, 
	plot_type, 
	plot_id , 
	plot_options ,
    }     
    _interface.client.send(JSON.stringify(plot_ops))     
    
}


interface BarPlotParams {
    title? : string, 
    tools? : string, 
    height? : number,
    width? : number, 
    sizing_mode? : string, 
    data : any ,
    source_id  : string,
}

export function bar_plot(params : BarPlotParams ) {

    //first we register the data
    let data_registration_ops = {
	'type' : 'register_data'  ,
	id : params.source_id , 
	data : params.data 
    }
    _interface.client.send(JSON.stringify(data_registration_ops))

    //then we prep the message

    let ops = {
	'type' : 'bar_plot'  ,
	source_id : params.source_id , 
    } 
    _interface.client.send(JSON.stringify(ops))
    
}
