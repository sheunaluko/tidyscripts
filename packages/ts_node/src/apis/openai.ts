
import { Configuration, OpenAIApi } from "openai";
import {logger, util} from "tidyscripts_common" 

const ORG = process.env.OPENAI_ORG
const API_KEY = process.env.OPENAI_API_KEY

const log = logger.get_logger({id : "openai"}) ; 

const configuration = new Configuration({
    organization: ORG, 
    apiKey: API_KEY, 
});

export const client = new OpenAIApi(configuration);


/**
 *  List Engines 
 */

export async function list_engines() {
    let result = (await client.listEngines() ) as any 
    return result 
}




/**
 * A function to send a message to the API and return the generated response
 * Uses the DaVinci 003 Model
 * Much more to come!
 */
export async function send_message(message: string, max_tokens : number): Promise<any> {
    log(`Using org: ${configuration.organization}`) ;
    log(`Using key: ${configuration.apiKey ? true : false}`) ;
    let reqObj = {
	model: 'text-davinci-003',
	prompt: message,
	max_tokens, 
    }

    log('using req object:') ;
    console.log(reqObj) 
    const response = await client.createCompletion(reqObj as any); 
    return response
}


/**
 * Chat completions endpoint 
 */
export async function chat_completion(messages: any, model : string, max_tokens : number): Promise<any> {
    log(`Using org: ${configuration.organization}`) ;
    log(`Using key: ${configuration.apiKey ? true : false}`) ;
    let t_start = util.unix_timestamp_ms()  ;
    
    try {

	const chatCompletion = await client.createChatCompletion({
	    model, 
	    messages,
	    max_tokens, 
	});
	let t_elapsed = util.unix_timestamp_ms() - t_start ;
	let response  = chatCompletion.data.choices[0].message ; 

	return {  response, t_elapsed }
	
    } catch (e) {
	let response = "api error"	
	let t_elapsed = util.unix_timestamp_ms() - t_start ;
	log(`Error!`)
	log(e)
	return  { response, t_elapsed , error : e } 
    } 

}
