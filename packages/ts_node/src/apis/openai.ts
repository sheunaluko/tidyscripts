
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
  log(`Using org: ${configuration.organization}`) ;
  log(`Using key: ${configuration.apiKey}`) ;
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



