import { OpenAI } from "openai";
import { Patient } from "fhir/r4";

import * as logger  from "../logger" ;
import * as db from "../util/debug" ;  

const log = logger.get_logger({id: "dgen"}) ;

const openai = new OpenAI()


/**
 * Generic completion 
 */
export async function generic_completion_json(prompt: string): Promise<any> {

    log(`Using prompt: ${prompt}`) ;
    db.add("prompt" , prompt ) 
    
    log(`Requesting chat completion`) ; 
    const completion = await openai.chat.completions.create({
	model: "gpt-4o",
	messages: [
            { role: "system", content: "You are a helpful assistant." },
            {
		role: "user",
		content: prompt 
            },
	],
    });

    log(`Accesing chat response...`) ;     
    let data_str = (completion.choices[0].message.content as any) ; 
    db.add("data_str" , data_str )     
    log(`String= ${data_str}`) ;     
    log(`Cleaning string`)
    let cleaned_str = clean_json_string(data_str)
    db.add('cleaned_str' , cleaned_str)
    log(`Attempting parse`) 
    let data     = JSON.parse(cleaned_str)
    db.add("data", data)
    log(`Successfully parsed json data, available from debug.get("data")`)

    // return the data  
    return data
    
}

/**
 * Generates random FHIR R4 patient data using the OpenAI API based on an input string.
 *
 * @param {string} input_text - Arbitrary input text to seed the OpenAI completion model.
 * @returns {Promise<Patient>} - Returns a promise that resolves to a FHIR R4 Patient resource.
 *
 * @example
 * ```typescript
 * const random_patient = await generate_random_fhir_patient("Jane Doe with diabetes");
 * console.log(random_patient);
 * ```
 */
export async function generate_random_fhir_patient(input_text: string): Promise<Patient> {

    const prompt = `Given the following text: "${input_text}", generate  (in JSON format) a random FHIR R4 Patient (with attributes such as name, gender, birthDate, and address) as well as a random set of 10 fhir resources (Observations, DiagnosticReports, DocumentReferences, etc) that match that patient's profile. Do not return anything other than the JSON string

        It is absolutely ESSENTIAL THAT YOU RETURN THE RESULT AS A JSON OBJECT that represents a FHIR bundle and with the first character of output as "{" and the last character as "}". 


`  ;

    return (await generic_completion_json(prompt) ) ; 
    
} 

/**
 * Given a string, returns simulated R4 FHIR Data 
 * 
 * 
 */
export async function get_fhir_data(info : string)  { 

    try {
	const random_patient = await generate_random_fhir_patient(info);
	log(`Generated FHIR Patient data: ${JSON.stringify(random_patient, null, 2)}`)
	return random_patient
	
    } catch (error) {
	console.error("Error generating FHIR data:", error);
    }

}


/**
 * 
 * Convert a string of text into a set of loinc codes via llm 
 * 
 */
export async function generate_loinc(info : string)  { 

    try {
	const prompt = `Generate a set of loinc codes in JSON format (only output the json string, nothing else) which can be used to represent the following free text: ${info} . 

        It is absolutely ESSENTIAL THAT YOU RETURN THE RESULT AS A JSON ARRAY OF LOINC OBECTS with the first character of output as "[" and the last character as "]". 

  `

	const result = await generic_completion_json(prompt) ;  

	log(`Received the following loinc objects`)
	console.log(result)
	
	return result 
	
    } catch (error) {
	console.error("Error:", error);
	
    }

}




/**
 * Cleans the raw string by extracting the JSON content between the first `{` and the last `}`.
 * Also replaces escaped new line characters and escaped quotes.
 *
 * @param {string} raw_string - The raw string to be cleaned.
 * @returns {string} - A cleaned JSON string.
 *
 * @example
 * ```typescript
 * const cleaned_string = clean_json_string('Some text before { "key": "value" } some text after');
 * console.log(cleaned_string); // Outputs: '{ "key": "value" }'
 * ```
 */
export function clean_json_string(raw_string: string): string {

  // Replace escaped newlines and escaped quotes
  raw_string = raw_string.replace(/\\n/g, "").replace(/\\"/g, '"');
  raw_string = raw_string.replace(/\n/g, '')     
  // And other cleaning 
  raw_string = raw_string.replace("```json", "")
  raw_string = raw_string.replace("```", "")

  // return 
  return raw_string ; 
}


