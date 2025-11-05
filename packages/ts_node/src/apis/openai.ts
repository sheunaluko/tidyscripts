

import {OpenAI} from "openai" ; 
import {logger, util} from "tidyscripts_common" 

const ORG = process.env.OPENAI_ORG
const API_KEY = process.env.OPENAI_API_KEY

const log = logger.get_logger({id : "openai"}) ;

/*
const configuration = new Configuration({
    organization: ORG,
    apiKey: API_KEY,
});
 */

// Create client lazily to avoid initialization errors when OPENAI_API_KEY is not set
let _client: OpenAI | null = null;

function getClient(): OpenAI {
    if (!_client) {
        log(`OPENAI API KEY: ${API_KEY}`)
        _client = new OpenAI(); //default for v4 is to use the env var
    }
    return _client;
}

// Export for backward compatibility
export const client = {
    get chat() { return getClient().chat; },
    get completions() { return getClient().completions; },
    get embeddings() { return getClient().embeddings; },
    get files() { return getClient().files; },
    get images() { return getClient().images; },
    get audio() { return getClient().audio; },
    get moderations() { return getClient().moderations; },
    get models() { return getClient().models; },
    get fineTuning() { return getClient().fineTuning; },
    get beta() { return getClient().beta; },
    get batches() { return getClient().batches; }
}; 


/**
 * A function to send a message to the API and return the generated response
 * Uses the DaVinci 003 Model
 * Much more to come!
 */
export async function send_message(message: string, max_tokens : number): Promise<any> {
    let reqObj = {
	model: 'text-davinci-003',
	prompt: message,
	max_tokens, 
    }

    log('using req object:') ;
    console.log(reqObj) 
    const response = await client.chat.completions.create(reqObj as any); 
    return response
}


/**
 * Chat completions endpoint 
 */
export async function chat_completion(messages: any, model : string, max_tokens : number): Promise<any> {
    let t_start = util.unix_timestamp_ms()  ;
    
    try {

	const chatCompletion = await client.chat.completions.create({
	    model, 
	    messages,
	    max_tokens, 
	});
	let t_elapsed = util.unix_timestamp_ms() - t_start ;
	let response  = chatCompletion.choices[0].message ; 

	return {  response, t_elapsed }
	
    } catch (e) {
	let response = "api error"	
	let t_elapsed = util.unix_timestamp_ms() - t_start ;
	log(`Error!`)
	log(e)
	return  { response, t_elapsed , error : e } 
    } 

}
