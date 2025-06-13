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

export async function embedding1024(text : string) {
    let client = get_openai() ;
    
    const embedding = await client.embeddings.create({
	model : 'text-embedding-3-small' ,
	input  : text ,
	dimensions : 1024, 
	encoding_format : "float" , 
    });

    let vector = embedding.data[0].embedding ;

    return vector 
}


export async function structured_prompt(text : string, output_format : any ,  tier : string ) {
    let client = get_openai()
    let model = (model_map[tier] || 'gpt-4o')
    
    const response = await client.responses.parse({
	model, 
	input: [
	    { role: "system", content: "Provide the requested output." },
	    {
		role: "user",
		content: text,
	    },
  ],
	text: {
	    format: output_format , 
	},
    })

    return response.output_parsed 

}
