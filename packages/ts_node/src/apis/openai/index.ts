import {OpenAI} from "openai" ; 
import {logger, util} from "tidyscripts_common" 

const ORG = process.env.OPENAI_ORG
const API_KEY = process.env.OPENAI_API_KEY
const log = logger.get_logger({id : "openai"}) ; 

import * as directory_analyzer from "./directory_analyzer" 

export {directory_analyzer} ; 


export const client = new OpenAI(); //default for v4 is to use the env var for API key


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


/**
 * Extracts the first text response from the given OpenAI API response object.
 * If the response does not contain a valid message, throws an error with detailed logging.
 * @param response - The OpenAI API response object.
 * @returns The first text response from the assistant.
 * @throws Error if the response does not contain a valid message.
 */
export function extract_first_text_response(response: any): string {
    try {
        if (response && response.choices && response.choices.length > 0) {
            const message = response.choices[0].message;
            if (message && message.content) {
                return message.content;
            } else {
                log(`Response object: ${JSON.stringify(response, null, 2)}`);
                throw new Error("Response does not contain a valid message content.");
            }
        } else {
            log(`Response object: ${JSON.stringify(response, null, 2)}`);
            throw new Error("Response does not contain any choices.");
        }
    } catch (error : any) {
        log(`Error extracting text response: ${error.message}`);
        log(`Response object: ${JSON.stringify(response, null, 2)}`);
        throw new Error(`Failed to extract text response: ${error.message}`);
    }
}
