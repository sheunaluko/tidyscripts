import { EventEmitter } from "events";
import {get_logger} from "../../../logger"
import * as debug from "../../../util/debug" 

export interface BE_OPS {
    name : string
    model : string, 
}

export interface SC_OPS {
    prompt : string ,
    response_format : any , 
}

export var base_llm_args =  {
    temperature : 0  
} 

export class BaseEngine extends EventEmitter {

    name: string;
    model : string; 
    logger : any ; 

    constructor(ops: BE_OPS) {
	super() ; 
	this.name = ops.name ;
	this.model = ops.model ; 
	this.logger = get_logger({id:`amie:${ops.name}`})
    }

    init() {
	this.log(`Created engine ${this.name} with model ${this.model}`) ; 
    }

    log(x : string)  {
	this.logger(x)
	this.emit("log" , {data : x } ) 
    }

    async structured_completion(ops : SC_OPS) {

	let {prompt, response_format } = ops ; 
	
	let messages = [
	    {role : 'user' , content :  prompt }
	]

	let model = this.model ;
	
	let args = {
	    ...base_llm_args ,
	    ...{ messages , model , response_format  }
	}

	this.log(`Request to call structured completion`)
	debug.add(`SC_ARGS` , args)  ;

	/*
	   Todo, create a new tidyscripts endpoint oai_structured_completion_proxy 
	   Which accepts the arguments, gets the result, and returns the entire response info 
	   One of the keys in the object can be 'secret_key' which it uses to accept or reject the request 
	   It removes the 'secret_key' from the object then passes it to the openai api 

	   This will allow monitoring of token usage in the base_engine as well, in addition to identifying and limiting clients, etc 
	   
	   The base class should handle keeping track of token usage, emitting those events, etc, so that the child classes can 
	   forget about it 

	 */
	
	let result = await fetch("https://www.tidyscripts.com/api/openai_structured_completion", {
	    method : 'POST',
	    headers : {'Content-Type' : 'application/json' } ,
	    body : JSON.stringify(args)
	})

	return await result.json() 
	
    }

    
}


