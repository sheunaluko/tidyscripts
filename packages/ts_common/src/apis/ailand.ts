/**
 * AI API 
 *
 */

import {get_openai} from "./oai"


const model_map : any =  {
    'top' : 'gpt-4o' ,
    'top_think' : 'o4-mini' ,
    'quick' : 'gpt-4.1-nano' 
}


export async function prompt(prompt : string , tier : string  ) {


    let model = (model_map[tier] || 'gpt-4o') 
    
    let client = get_openai() ;
    let response = await client.responses.create({
	model ,
	input : prompt , 
    });

    let text = response.output_text ;
    return text
    
} 
