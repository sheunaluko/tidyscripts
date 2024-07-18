/* util.ts imports */
import * as prompts from "../prompts"
import * as tsw from "tidyscripts_web"
import {generate_prompt} from "./hp" 

/* tidyscripts imports */
const log    = tsw.common.logger.get_logger({id:"cds_util"}) 
const debug  = tsw.common.util.debug
const fp     = tsw.common.fp

/* Util function definitions */ 

export async function generate_hp(clinical_information : string) {
    
    const prompt = generate_prompt(clinical_information);
    //get a ref to the open_ai_client 
    let client = tsw.apis.openai.get_openai() ; 
    const response = await client.chat.completions.create({
	model: "gpt-4o",
	messages: [
	    { role: 'system', content: 'You are an expert clinician that generates synthetic history and physical notes for the user.' },
	    { role: 'user', content: prompt }
	]
    });
    let content = response.choices[0].message.content;
    content = content.replace("- BEGIN H&P INSTRUCTIONS -", "").replace("- END H&P INSTRUCTIONS -", "").trim();
    return content 
}


export async function get_individaul_dashboard_info(hp : string,  dashboard_name : string) {
    // -- get a ref to the open_ai_client 
    let client = tsw.apis.openai.get_openai() ;

    // -- generate the prompt 
    let dashboard_prompt = await prompts.generate_full_prompt(hp, dashboard_name)

    /*
       Need to finish implementation 
     */ 
    return dashboard_prompt;
    
}





export async function get_all_dashboard_info(hp: string) {
    // -- get a ref to the open_ai_client 
    let client = tsw.apis.openai.get_openai();

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


async function get_all_dashboard_info_old(hp : string) {
    // -- get a ref to the open_ai_client 
    let client = tsw.apis.openai.get_openai() ;

    // -- generate the prompt 
    let dashboard_prompt = await prompts.generate_quick_prompt(hp, ["medication_review" , "labs", "imaging", "diagnosis_review"])
    
    // -- debug
    tsw.common.util.debug.add("generated_dashboard_prompt", dashboard_prompt) 
    
    // --  query the AI with the prompt
    const response = await client.chat.completions.create({
	model: "gpt-4o",
	messages: [
	    { role: 'system', content: 'You are an expert and enthusiastic clinical decision support tool' },
	    { role: 'user', content: dashboard_prompt }
	]
    });
    
    let dashboard_info = response.choices[0].message.content;

    // -- debug
    tsw.common.util.debug.add("dashboard_info", dashboard_info) 


    return dashboard_info
    
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
