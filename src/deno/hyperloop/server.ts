/* 
Wed Mar 18 23:58:08 2020 => Sat Aug  8 16:45:05 PDT 2020
Sheun Aluko 
@copyright sattsys  

A decentralized, asynchronous, cross platform (serialized)
communication infrastructure (hyperloop) 
written in typescript 

*/

import {WebSocket,WebSocketServer} from "../base_imports.ts" 

import * as common from "../../common/util/index.ts" ; //common utilities  


let log = common.Logger("hyperloop")



/* 
 SERVER IMPLEMENTATION 
*/

interface ServerOps {
  port: number | string;
}

interface RegisterOps {
    id: string;
  }

interface RegisterFunctionOps {
  id: string;
  args_info: any[];
}

interface CallFunctionOps {
  id: string;
  call_identifier : string , 
  args: { [k: string]: any };
}

interface ReturnValueOps { 
    call_identifier : string, 
    data : any , 
}

export class Server {
  ops: ServerOps;
  log: any;
  server: any //WebSocket.Server;

  clients_by_id: { [k: string]: any }

  function_table : { [k: string] : any} 

  /* 
  The lobby is a map of call_identifiers to corresponding call_requestor_clients (ws instances) 
  When a client requests a function call it does so with a call_identifier as part of the payload, 
  and this id gets used as a key and the client gets stored as the value 

  Then the function is looked up in the function table and the corresponding provider client is found. 
  A dispatch is sent to the provider client , which includes the call_identifier

  When the provider client finishes processing the message, it sends a response back wiht the 
  same call_identifier, and the lobby data structure is used to lookup the original requestor_client, 
  to whome the final data is returned via websocket 
  */ 
  lobby : { [k :string] : any}  

  constructor(ops: ServerOps) {
    this.ops = ops;
    this.log = common.Logger("hl_hub"); 
    this.clients_by_id = {}
    this.function_table = {} 
    this.lobby = {} 
  }

  initialize() {
    let port = this.ops.port as number;
    //var wss = new WebSocket.Server({ port });
      var wss = new WebSocketServer(port) ; 
      
      let that : any = this ; 

    //create the callbacks now
    wss.on(
      "connection",
      function connection(ws: any) {
        //cannot really do anything until we know what the subscribe id is
          that.log("A client connected! => " ) 
	  //that.log(JSON.stringify(ws)) 

        ws.on(
          "message",
          function incoming(message_string: string) {
            var msg = JSON.parse(message_string);

            switch (msg.type) {

            /*
                Allow a client to register with a unique ID   
            */
                case "register" : 
                that.register(msg,ws) 
                break; 

              /*
                  Allows a client to register functionality (a function) with the hub  
                  */
              case "register_function":
                that.register_function(msg, ws);
                break;

              /* 
                Allows a client to request a function call from the hub 
               */

              case "call":
                that.call_function(msg, ws);
                break;

              /* 
                Allows a client to RETURN a function return value to the hub 
                (after it has been called) 
              */
              case "return_value":
                that.return_value(msg, ws);
                break;

              /* 
                Requests from the hub a description of all functions available
                through it 
              */
              case "list_functions":
                that.list_functions(msg,ws);
                break;

              default:
                that.log("Unrecognized message type:");
                that.log(msg);
            }
          }.bind(that)
        );

        ws.on(
          "close",
          function close() {
            that.handle_close({ ws });
          }.bind(that)
        );
      }.bind(that)
    );
    // - end callbacks

    this.log("wss listening on port: " + port);
    this.server = wss;
  }


  /*
    Allows a client  register with a unique ID 
   */
  register(msg: RegisterOps, ws: any) {
    let id = msg.id;
    this.log("Received register request from:" + id);
    this.log("Saving client");
    this.clients_by_id[id] =  ws 
    this.log("Appending id to ws instance data") 
    ws.hyperloop_id = id 

    //send ack 
    this.acknowledge_register(ws) 
  }


  /*
    Allows a client to register functionality (a function) with the hub  
   */
  register_function(msg: RegisterFunctionOps, ws: any) {
    let id = msg.id;
    this.log("Received register FUNCTION request from:" + ws.hyperloop_id);
    this.function_table[id] = {
      provider: ws,
      id,
      args_info: msg.args_info,
      provider_id : ws.hyperloop_id ,
    };
    this.log("Updated function table with id: " + id );
    this.log("Args Info was: ");
    this.log(msg.args_info);
  }

  /* 
    Allows a client to request a function call from the hub 
   */
  call_function(ops: CallFunctionOps, ws: any) {
      let { id,args,call_identifier} = ops ; 
      this.log("Recieved request to call function from:" + ws.hyperloop_id) 
      this.log("Request:") 
      this.log(ops) 

      let function_info = this.function_table[id] 
      //maybe there is no function in the table 
      if (! function_info) { 
        this.reply_no_function(ws,call_identifier)
        return 
      } 

      //the function DOES EXIST   -- 

      //configure the lobby so that the function return value will be handled 
      //appropriately 
      this.lobby[call_identifier] = { 
          requesting_client : ws , 
          requesting_client_id : ws.hyperloop_id , 
      }
      this.log("Updated lobby for client reply") 
      
      //then shoot off the request 
      let msg = { 
          id, 
          args , 
          call_identifier , 
      }
      this.send_call_request(function_info.provider,msg)
      this.log("Sent call request to client: ") 
      this.log(msg) 
  }

  /* 
    Allows a client to RETURN a function return value to the hub 
    (after it has been called) 
  */
  return_value(ops: ReturnValueOps, ws: any) {
    let {call_identifier,data} = ops  
    this.log("Got return value from: " + ws.hyperloop_id) 
    this.log(ops) 
    this.log("looking for call_identifier") 

    let requesting_client_info = this.lobby[call_identifier] 

    if (!requesting_client_info) { 
        this.log("Could not find any curreny associated call_identifier!") 
        //do nothing with the value for now 
        return 
    }

    //found some client 
    let {requesting_client,requesting_client_id} = requesting_client_info   
    this.log(`Will return data to requesting client: ${requesting_client_id}`)

    let msg = { 
        type : "return_value" , 
        call_identifier, 
        data , 
    }
    this.send_msg(msg,requesting_client) 
    this.log("Send the requesting client the data")

    this.log("Cleaning state:") 
    this.log("clearing lobby: " + call_identifier) 
    this.lobby[call_identifier] = undefined 

  }

  /* 
    Requests from the hub a description of all functions available
    through it 
   */
  list_functions(ops : {call_identifier : string} , ws: any) {

    let {call_identifier} = ops 

      this.log("Got request to list_functions")  
      this.log(ops) 
      
      //get the current list of all functions 
      //as well as their associated args_info 
      let fn_ids = Object.keys(this.function_table)   
      let data = fn_ids.map(f_id=>{
	  let {args_info} = this.function_table[f_id]
	  return { 
	      args_info , 
	      id : f_id 
	  }
      }) 
      
      let msg = { 
	  type : "return_value" , 
      data , 
      call_identifier, 
      }
      
      this.log("Sending response: ") 
      this.log(msg) 
      this.send_msg(msg,ws) 
  }

  /* 
  Send a message to a ws client 
  */ 
 send_msg(msg : object,ws :any) {  
     ws.send(JSON.stringify(msg)) 
 }


 reply_no_function(ws : any,call_identifier : string) { 
     let msg = { 
         data : { 
         error : true , 
         reason : "function_not_found", 
         }, 
         type : "return_value", 
         call_identifier , 
     }
     this.send_msg(msg,ws)
     this.log(`Sent no function response to :${ws.hyperloop_id}`) 
     this.log(msg)
 }

 send_call_request(ws : any, msg : {id : string , args : any, call_identifier : string}) {
     let {args,call_identifier,id}= msg 
     let _msg = {args,call_identifier, id, type :"call"}
    this.send_msg(_msg,ws)

 }

 acknowledge_register(ws : any) { 
     let msg = {
         type : "registered"
     }
    this.send_msg(msg,ws)
    this.log("Ackldged register for client") 
 }

  handle_close(ws: any) {
    this.log("Handling close");
  }
}
