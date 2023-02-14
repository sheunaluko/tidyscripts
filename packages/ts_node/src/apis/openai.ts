
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

export async function listEngines() {
  let result = (await client.listEngines() ) as any 
  return result 
} 



/**
 *  set up a function to send a message to the API and return the generated response
 */

export async function sendMessage(message: string, context?: string): Promise<any> {
  const response = await client.createCompletion({
    model: 'text-davinci-003',
    prompt: message,
    max_tokens: 100 ,
    //context,
  } as any);
  return response
}

export var responses =  [ ] ; 

/**
 * set up a function to simulate a conversation with the bot
 * 
 */
export async function simulateConversation() {
  let message = '';
  //let context: string | undefined;
  while (message.toLowerCase() !== 'goodbye') {
    // get the user's message from the console
    message = await new Promise((resolve) => {
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      readline.question('You: ', (message) => {
        readline.close();
        resolve(message);
      });
    });

    // generate a response to the user's message
    responses.push( await sendMessage(message, null) ) 

    // update the context for the next message
    // context = response;

    // log the response to the console
   // log(response) 
  }
}
