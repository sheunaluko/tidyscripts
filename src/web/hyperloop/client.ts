



/* 
Wed Mar 18 23:58:08 2020 => Sat Aug  8 17:22:59 PDT 2020

Sheun Aluko 
@copyright sattsys  

A decentralized, asynchronous, cross platform (serialized)
communication infrastructure (hyperloop) 
written in typescript 

WEB CLIENT CODE 


USAGE: 

hc = new tsw.hyperloop.client.Client({ host : "127.0.0.1", port : 9500, id : "web1"})
hc.call({id , args}).then( (result : any) => console.log(result) )

*/




//import * as util from "../utils/index";
import * as common from "../../common/util/index.ts" ; //common utilities  
let log = common.Logger("hl_client")

import * as wutil from "../util/index.ts" 
import {ext_log} from "./ext_log.ts"  //import the hyperloop external logger 
import * as cache  from "./client_cacher.ts"


/* 
 CLIENT IMPLEMENTATION  
*/

/* 
    workflow: 
    let c = new client() 

    await c.connect({id : "meh"})  //will connect and register 
    await c.register_function({id: f_id, args_info, handler : some_handler})

    client must also handler "calls" after it registers 
    client.on("call", function(data) => {} )
    //must return a msg that has type: "return_value" which 
    //includes the call_identifier

    OR 

    let c2 = new client() 
    let result = c2.call({id: "meh", args : {default : 10}}) 
*/ 


export interface ClientOps { 
    host : string, 
    port : string | number , 
    secure : boolean , 
    id : string , 
}


interface CallFunctionOps {
    id: string;
    args: { [k: string]: any };
  }


interface RegisterFunctionOps {
    id: string;
    handler : (args : {[k:string] : any})=>any  
    args_info: any[] 
}


export class Client { 

    ops : ClientOps 
    conn  : any 
    log: any 

    function_table : { [k:string ] : any} 
    lobby : { [k:string ] : any}     //for async call_identifiers


    registration_promise: Promise<string>;
    fullfill_registration: any  ;



    constructor(ops : ClientOps ) { 
        this.ops = ops  
        this.log = common.Logger("hlc_" + ops.id);
        //initialize objects 
        this.lobby = {} 
        this.function_table = {} 
        this.conn = null 

        
        //registration promise will be set in connect and can be awaited for better async
        var fullfill_registration = null;
        this.registration_promise = new Promise((resolve, reject) => {
        fullfill_registration = resolve;
        });
        this.fullfill_registration = fullfill_registration; //get copy so we can resolve later
    
    } 



    async connect(secure : boolean = true) { 
	
	var url = null ; 
	if (secure) { 
	    url = `wss://${this.ops.host}:${this.ops.port}`
	} else { 
            url = `ws://${this.ops.host}:${this.ops.port}`;	    
	}

        /* 
        Perform the websocket connection 
        */ 

       this.log("Attempting connection to url: " + url);
       var ws = new WebSocket(url);
        this.conn = ws 
       //now we set the callbacks
	
	let that = this ; 
	
	
	
       ws.addEventListener(
         "open",
         function open() {
           that.log("Connection successful");
           //send a registration message now via the protocol
           that.register();
         }.bind(that)
       );
   
       ws.addEventListener(
         "message",
           function message(ev : any) {
	       
	       let _msg = ev.data 
	       
	       
               let msg = JSON.parse(_msg) 
               that.log("got message:") 
               that.log(msg)
               switch (msg.type) {
		       
		   case "call" : 
		       that.handle_call(msg) 
		       break;

		   case "registered" : 
                       that.log("Received registered ack")
                       that.fullfill_registration("REG COMPLETE") 
                       
                       break 

		   case "return_value" : 
                       that.handle_return_value(msg) 
                       break 
		       
		   default:
		       that.log("Unrecognized message type:");
		       that.log(message);
               }
	       
	       return 0 
	       
         }.bind(that)
       );
   
       ws.addEventListener(
         "close",
         function close() {
           that.log("The ws connection was closed");
         }.bind(that)
       );

       return that.registration_promise 
     
    }
    


  async handle_call(msg: { args: any; call_identifier: string; id: string }) {
    this.log("Received call request");
    /* 
         Lookup the function in the function table 
         and run it with the given args  asyncrhonously, 
         and after the return value is retrieved then 
         we send a message back with the type "return_value" 
         and fields call_identifier, data 
        */

    let { args, call_identifier, id } = msg;
    let fn_info = this.function_table[id];

    //check if args has a logger
    if (!args) { args = {} } 
    if (!args.log) {
      this.log("Setting logger of async handler");
      args.log = this.log;
    }

    this.log("Args is:")
    this.log(args)

    var _msg = null;

    if (!fn_info) {
      //for some reason the function does not exist
      _msg = {
        data: {
          error: true,
          reason: "endpoint_reported_no_exist"
        },
        call_identifier,
        type: "return_value"
      };
      this.send(_msg);
      this.log("Could not find so sent error");
      return;
    }

    //the function does exist... in this case we async it
    //then
    this.log("Running handler");
    let result = await fn_info.handler(args);
    this.log("Got result: ");
    this.log(result);
    _msg = {
      data: {
        error: false,
        result
      },
      call_identifier,
      type: "return_value"
    };

    this.log("Sending result to hub:");
    this.log(_msg);
    this.send(_msg);
  }


    handle_return_value(msg : {call_identifier : string,data :any}) { 
        /* 
        We have in the past called await call(...) 
        and we will be retrieving return info here

        1st we check the LOBBY for the call_identifier,
        then we RESOLVE the associated promise 
        */

        this.log("Got return value: ") 
        this.log(msg) 

       
        let {call_identifier,data} = msg 
        let  {promise,promise_resolver}  = this.lobby[call_identifier]  
        promise_resolver(data) 
        this.log("Resolved promise with returned data") 
        //clean 
        this.lobby[call_identifier] = undefined


    }

  send(msg: object) {
    if (!this.conn) {
      throw "Ws connection has not been initialized";
    }
    this.conn.send(JSON.stringify(msg));
  }

  register() {
    let msg = {
      type: "register",
      id: this.ops.id || "anon" 
    };
    this.send(msg);
    this.log("Sent register message:\n" + JSON.stringify(msg));
  }

  register_function(ops : RegisterFunctionOps) { 
      //add the id to the LOCAL function table 
      //build a register request object and send it 
      let {id, args_info,handler} = ops 
      let msg = { 
          id, 
          args_info, 
          type : "register_function"  
      }

      this.send(msg) 
      this.log("Sent register function message") 
      this.log(msg) 

      //update the function table 
      this.function_table[id] = {args_info,handler}
      this.log("Added function to local function table") 
      this.log(this.function_table)
  } 

  async get_available_functions() { 
    
    //generate a call_id 
    let call_identifier = this.gen_call_id()   
    //generate the message 
    let msg = { 
        type : "list_functions"  , 
        call_identifier, 
    }

    this.send(msg) 
    this.log("Sent list_functions request") 
    this.log(msg) 

    //create the promise we will return
    //and get out a reference to its resolver 
    var promise_resolver = null 
    let promise = new Promise((resolve,reject) => { 
        promise_resolver = resolve      
    }) 

    //update the lobby since we will be waiting for a response 
    this.lobby[call_identifier] =  { promise, promise_resolver} 
    this.log("Updated lobby to await async response") 

    //return the promise 
    return promise 
} 


  /* 
    Allows this client to asynchronously query the hyperloop for some function call
    Does not perform any caching (this is a helper function used by async call() below 
  */    
  async uncached_call(ops : CallFunctionOps) { 
      
      await this.await_registration()  //hmm ? lol this line solved an interesting bug 
      // when a react component was rendering to the screen and then immediately using 
      // HL to retrieve data it was erroring that websocket was not connected yet 
      
      
      //generate the call_identifier       
      let call_identifier = this.gen_call_id() 

      //build the appropriate message to call a funciton on the server side  
      let {id,args} = ops 

      //check if args has a logger 
      if (!args.log) { 
        this.log("Setting logger of async handler")
        args.log = this.log 
      }

      let msg = { 
          id, 
          args, 
          type :"call",
          call_identifier, 
      }

      //create a promise and promise resolver
      var promise_resolver = null; 
      var promise = new Promise((resolve,reject) => {
        promise_resolver = resolve 
      }) 
    
      //store  the promise resolver under the the call_identifier in the lobby
      this.lobby[call_identifier] = {promise,promise_resolver} 

      //send the message 
      this.send(msg) 

      //return the promise 
      return promise
  }
    

  /* 
    Allows this client to asynchronously query the hyperloop for some function call 
    The caching is performed here, while raw request is in in uncached_call (see above) 
  */    
  async call(ops : CallFunctionOps) { 
      
      //check the cache 
      let { hit, value : cache_result, call_id }  = await cache.check_cache_for_call_ops(ops) 
      
      //return the cached value if there is a hit 
      if (hit) { 
	  log("Returning cached value")
	  return {hit, data : cache_result } 
      } 
      
      log("No result in cache :o -> will request it") 
	  
      //if not we proceed to obtain the value 
      let request_result = await this.uncached_call(ops) 
      
      //and then we determine its ttl using the cache rules 
      let ttl = cache.get_ttl(ops) 
      log(`Got result for call. TTL is -> ${ttl}`) 
      
      // set it with the ttl 
      if (ttl)  { 
	  await cache.set_with_ttl( { id : call_id , ttl_ms : ttl , value : request_result }) 
	  log("Set val + ttl in cache") 
      } 
      
      return {hit, data : request_result}   
      
  }

  await_registration() {
    return this.registration_promise;
  }

  gen_call_id() {
      return wutil.uuid() ; 
  }
}





export async function test_client() {
    log("Testing hyperloop web client") 
    let hc = new Client({ secure: false, host : "127.0.0.1", port : 9500, id : "web1"})
    await hc.connect() 
    
    let test_url = "https://www.wikidata.org/w/api.php?action=wbgetentities&sites=enwiki&titles=Berlin&props=descriptions&languages=en&format=json" 
    
    
    log("Connected to hyperloop - now checking http_json status") 
    let result = await  hc.call({
	id: "sattsys.hyperloop.http_json" , 
	args: { url : test_url  }
    }).then( (result : any) => { 
	log("Got result:") 
	console.log(result) 
    }) 
    
} 
				    
