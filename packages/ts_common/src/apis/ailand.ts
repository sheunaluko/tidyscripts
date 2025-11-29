/**
 * AI API
 *
 */

import {get_openai} from "./oai"
import {serverless_query} from "../utils"


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


/**
 * Get text embedding from cloud serverless function
 * Uses text-embedding-3-small model via the /api/openai_embedding endpoint
 *
 * @param text - Text to embed
 * @param dimensions - Optional dimension size (defaults to model's default of 1536)
 * @returns Embedding vector
 */
export async function get_cloud_embedding(text: string, dimensions?: number): Promise<number[]> {
    const response = await serverless_query('openai_embedding', {
        text,
        ...(dimensions && { dimensions })
    });

    return response.embedding;
}
