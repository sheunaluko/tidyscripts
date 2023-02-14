
import { Configuration, OpenAIApi } from "openai";
import {logger} from "tidyscripts_common" 

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
export async function send_message(message: string, max_tokens : number, context?: string): Promise<any> {
  const response = await client.createCompletion({
    model: 'text-davinci-003',
    prompt: message,
    max_tokens, 
   } as any); 
  return response
}



