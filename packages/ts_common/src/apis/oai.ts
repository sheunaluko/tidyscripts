import { OpenAI } from "openai";
import * as logger  from "../logger" ;
import * as db from "../util/debug" ;  
import { z } from 'zod';
import {is_browser} from "../util/index"  ; 
import { zodResponseFormat } from 'openai/helpers/zod';

const log = logger.get_logger({id: "oai"}) ;

/*
 * initialize open ai in a smart way 
 * 
 */
export function get_openai() {
    
    var openai = (  function() {
	if (is_browser()){
	    //if running in browser
	    log(`running openai in browser`) 
	    let apiKey = localStorage['OAAK'] ;
	    if (! apiKey) {
		let msg = "The OAAK localStorage variable is missing, please set it to proceed" ; 
		window.alert(msg) ;
		throw(msg) ; 
	    } else { 
		return ( new OpenAI( {apiKey,  dangerouslyAllowBrowser: true } ) )
	    }
	    
	} else {
	    log(`running openai NOT in browser`) 	
	    return new OpenAI()
	} 
    }
    )()

    return openai 
}


/*
 * TODO: call the openai structured completion endpoint 
 * 
 */ 
export async function call_structured_completion() {
    //this function will call the serverless function which is at api/openai_structured_completion
    
}

    
/*
 *  --  
 * 
 */ 
export async function test_1() {

    // define schema components 
    let User = z.object({name : z.string(), balance  : z.number()}) ; 
    let Room = z.array(User)  ;
    let ResponseFormat = z.object( { rooms : z.array(Room) }) ;
    let zrf = zodResponseFormat(ResponseFormat, 'zr' ) 

    // create AI prompt 
    let prompt = `Randomly Generate 3 separate Rooms with 3 unique users per room and return all results as json. Make the user balance in each room add to 1000`
    let result = await generic_completion_json_structured({prompt, zrf})

    // - 
    return result ; 
}




/**
 * Generic completion with structured_output
 * 
 * Provide a zod object to define the desired data structure to be return, as well as a prompt for the AI 
 * and get the parsed JSON data back 
 */
export async function generic_completion_json_structured(ops : any ): Promise<any> {
    
    let {prompt, zrf } = ops ;
    
    let oai_client = get_openai() ; 

    log(`Generating structured json query`) ; 
    log(`Using prompt: ${prompt}`) ;
    db.add("prompt" , prompt ) 
    
    log(`Requesting chat completion`) ; 
    const completion = await oai_client.beta.chat.completions.parse({
	model: "gpt-4o-mini-2024-07-18",
	messages: [
            { role: "system", content: "You are a helpful assistant." },
            {
		role: "user",
		content: prompt 
            },
	],
	response_format : zrf 
    }) ;

    const message = completion.choices[0]?.message;

    if (message?.parsed) {
	log(`Successfully parsed the message`)
	log(message.parsed)
	return message.parsed 
    } else {
	log(`Failed to parse response`)
	log(message) 
	return null 
    }

    
}


/**
 * Get OAI Embedding 
 *
 */
export async function get_embedding(text: string, embedding_size: number) {
    try {
	let oai_client = get_openai() 
	const response = await oai_client.embeddings.create({
	    input: text,
	    model: 'text-embedding-3-large',
	    dimensions: embedding_size,
	});

	return (response as any).data[0].embedding
	
    } catch (error) {
	console.error('Error fetching embedding:', error);
	throw error;
    }
}
