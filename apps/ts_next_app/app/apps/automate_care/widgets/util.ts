/* util.ts imports */
import * as prompts from "../prompts"
import * as tsw from "tidyscripts_web"
import {generate_prompt} from "./hp" 

/* tidyscripts imports */
const log    = tsw.common.logger.get_logger({id:"cds_util"}) 
const debug  = tsw.common.util.debug
const fp     = tsw.common.fp
let { get_json_from_url } = tsw.common ;


import * as fb from "../../../../src/firebase" 


/* Util function definitions */ 

export async function generate_hp(ops : any ) {

    let {clinical_information , client } = ops ; 

    const prompt = generate_prompt(clinical_information);
    const response = await client.chat.completions.create({
	model: "gpt-4o",
	messages: [
	    { role: 'system', content: 'You are an expert clinician that generates synthetic history and physical notes for the user.' },
	    { role: 'user', content: prompt }
	]
    });
    let content = response.choices[0].message.content;
    debug.add("hp_content" , content) 
    let filtered_content = content.replace('```markdown', "").replace('```',"")
    filtered_content      = filtered_content.replace("- BEGIN H&P INSTRUCTIONS -", "").replace("- END H&P INSTRUCTIONS -", "").trim();
    return filtered_content 
}


export async function get_individual_dashboard_info(ops: any) {
    let { hp, client, dashboard_name } = ops;
    
    // -- generate the prompt 
    let dashboard_prompt = await prompts.generate_full_prompt(hp, dashboard_name);
    
    // -- debug
    log("Generated dashboard prompt: " + dashboard_prompt);

    // -- query the AI with the prompt
    const response = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: 'system', content: 'You are an expert and enthusiastic clinical decision support tool' },
            { role: 'user', content: dashboard_prompt }
        ]
    });

    let content = response.choices[0].message.content;
    log("Received response content: " + content);
    debug.add("content", content);

    // -- extract JSON array from response content
    let dashboard_info = extractJsonArray(content);    
    log("Extracted dashboard info");
    debug.add("dashboard_info", dashboard_info);
    
    if (dashboard_info) {
        log("Extracted dashboard info: " + JSON.stringify(dashboard_info));
        return dashboard_info;
    } else {
        log("Error: Failed to extract valid JSON array from response.");
        return null;
    }
}



export async function wrapped_chat_completion(args : any) {

    /*
       Take the args and pass it to the vercel function instead 
     */

    let url = "/api/open_ai_chat_2"
    let fetch_response = await fetch(url, {
	method : 'POST' ,
	headers: {   'Content-Type': 'application/json'   },
	body : JSON.stringify(args)
    });
    debug.add("fetch_response" , fetch_response) ;
    let response = await fetch_response.json() ;
    debug.add("response" , response) ;

    return response 
}






export async function get_all_dashboard_info(ops : any ) {

    let {hp , client } = ops

    
    // -- generate the prompt 
    let dashboard_prompt = await prompts.generate_quick_prompt(hp, ["medication_review", "labs", "imaging", "diagnosis_review"]);
    
    // -- debug
    log("Generated dashboard prompt: " + dashboard_prompt);

    // -- query the AI with the prompt
    const response = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: 'system', content: 'You are an expert and enthusiastic clinical decision support tool' },
            { role: 'user', content: dashboard_prompt }
        ]
    });



    let content = response.choices[0].message.content;
    log("Received response content: " + content);
    debug.add("content" , content) ; 

    // -- extract JSON array from response content
    let dashboard_info = extractJsonArray(content);    
    log("Extracted dashboard info")
    debug.add("dashboard_info" , dashboard_info) 
    
    if (dashboard_info) {
        log("Extracted dashboard info: " + JSON.stringify(dashboard_info));
        return dashboard_info;
    } else {
        log("Error: Failed to extract valid JSON array from response.");
        return null;
    }
}



export function all_indexes_of_ch(val : string, arr :string) {
    var indexes = [], i;
    for(i = 0; i < arr.length; i++)
        if (arr[i] === val)
            indexes.push(i);
    return indexes;
}

export function extractJsonArray(text : string) {

    let si_s = all_indexes_of_ch("[" , text)
    let ei_s = all_indexes_of_ch("]" , text)

    /* must ensure that the length of each is atleast 1 */
    if ( (si_s.length > 0) && (ei_s.length > 0) ) {

	let si = fp.first(si_s)
	let ei = fp.last (ei_s)
	log(`Using start index:${si} and end index: ${ei}`)

	let extracted_string = text.slice(si, ei + 1)
	debug.add("extracted_string" , extracted_string)

	
	try {
	    // Parse the JSON array
	    return JSON.parse(extracted_string);
	    
	} catch (error) {
	    console.error("Error parsing JSON array:", error);
	    return null;
	}
	
	
	
    } else {

	log("Could not find either [ or ]")
	return null
	
    } 
    
    
    
}    




export async function transform_hp_to_fhir({client, hp} : { [k:string] : any } ) {


    // get client reference
    let _client = client 
    
    // -- generate the prompt 
    let hp_to_fhir_prompt = `
 You are an expert data generation assistant
 Your job is to transform textual medical data into fhir data (version R4) 
 You perform this job eagerly and meticulously and efficiently 
 You adhere strictly to FHIR version R4 
 Your output is a parsable json string 

 If the input contains information which cannot be represented as FHIR version R4 json objects, then you omit it from the output 
 You do not generate any extraneous data that is not present in the input
 Your output contains ONLY the json string and absolutely nothing else. The string should be immediately parsable by the JSON.parse() function

 Here is the information that you will convert into FHIR R4: 

 ${hp} 
 
 Remember the following: 

 You adhere strictly to FHIR version R4 
 Your output is a parsable json string 
 If the input contains information which cannot be represented as FHIR version R4 json objects, then you omit it from the output 
 You do not generate any extraneous data that is not present in the input
 Your output contains ONLY the json string and absolutely nothing else. The string should be immediately parsable by the JSON.parse() function

    `
    log("Generated hp_to_fhir_prompt " + hp_to_fhir_prompt);
    debug.add("hp_to_fhir_prompt" , hp_to_fhir_prompt);    

    // -- query the AI with the prompt
    const response = await _client.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: 'system', content: 'You are an expert and enthusiastic clinical decision support tool' },
            { role: 'user', content: hp_to_fhir_prompt }
        ]
    });

    debug.add("hp_to_fhir_response" , response)

    let content = response.choices[0].message.content;
    log("Received response content: " + content);
    debug.add("fhir_content" , content) ;
    let filtered_content = content.replace('```json', "").replace('```',"")
    debug.add("filtered_fhir_content" , filtered_content) ;

    let parsed = JSON.parse(filtered_content) 
    debug.add("fhir_parsed" , parsed) ;     
    
    return parsed 
}
