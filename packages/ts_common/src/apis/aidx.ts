/**
 * AI Diagnostics (Aidx) 
 * Interface to a general purpose clinical decision support library that leverages AI 
 * This library was built with the help of ChatGPT Research preview, and makes use of the Openai API 
 * to begin with. 
 * @Copyright Sheun Aluko 2023 
 */

import { get_json_from_url } from "../index"
import * as debug from "../util/debug"
declare var Math : any ; 

export type ApiResult = {error : boolean, data : any} 

/**
 * Cleans the response from the OpenAI API 
 * Assums the json starts with { or [ and attempts to trim the superfluous text 
 * before that, and also replaces newline and escape characters. 
 */
export function clean_json_string(jstring : string) {
  debug.add("pre_clean" , jstring) ;
  let cleaned = jstring.split("\n").join("").replace(/  /g,"").replace(",\}","\}") ;
  let bIndex = cleaned.indexOf("{") ;
  let aIndex = cleaned.indexOf("[") ;
  var cleanIndex = 0 ; 

  if (bIndex < 0 ) {
    cleanIndex = aIndex; 
  } else if (aIndex < 0 ) {
    cleanIndex = bIndex ; 
  } else {
    cleanIndex = Math.min(bIndex,aIndex)    ; 
  } 
    
  cleaned = cleaned.slice(cleanIndex,cleaned.length) ;
  debug.log(`extracting json starting at index ${cleanIndex}=${cleaned[cleanIndex]}`)
  debug.add("post_clean" , cleaned) ;
  debug.log(`Cleaned ${jstring} to \n\n\n ${cleaned}`) ; 
  return cleaned 
} 

export async function ask_ai(prompt : string , max_tokens : number) : Promise<ApiResult> {
  try {
    let res = await get_json_from_url("https://www.tidyscripts.com/api/openai_davinci" , {prompt , max_tokens}) ;
    debug.add("api_response" , res)
    debug.log("Logged the api repsonse")

    debug.log("Cleaning json string") ; 
    var cleaned_response = clean_json_string(res.text) ;
    debug.log(`Got cleaned response: ${cleaned_response}`) ;
    /*
      JSON.parse(res.text) by default assumes the endpoint returns a JSON string 
    */
    return { error : false, data : JSON.parse(cleaned_response) }   
  } catch (error) {
    debug.add("api_error" , error) ;
    debug.log("api_error experienced") ; 
    return { error : true , data : "api error"  } 
  } 
} 

type PatientData = {
  demographics: {
    age: number,
    gender?: string,
    ethnicity?: string,
    occupation?: string
  },
  symptoms: string[],
  lab_values: {
    lab : string ,
    value : any 
  }[],
  medical_history: string[],
  medications: {
    medication : string,
    dose : { value : string, frequency : string } 
  }[],
  tests: {
    test: string,
    result: string
  }[],
  physical_exam: string[]
}

export const example_patient: PatientData = {
  demographics: {
    age: 35,
    gender: "Male",
    ethnicity: "Caucasian",
    occupation: "Software Engineer"
  },
  symptoms: ["Fever", "Cough", "Fatigue"],
  lab_values: [
    {
      lab: "Magnesium",
      value: 1.5
    },
    {
      lab: "Calcium",
      value: 9.2
    },
    {
      lab: "Potassium",
      value: 4.0
    },
    {
      lab: "Sodium",
      value: 138
    }
  ],
  medical_history: ["Asthma", "Seasonal Allergies"],
  medications: [
    {
      medication: "Albuterol",
      dose: {
        value: "2 puffs",
        frequency: "as needed"
      }
    },
    {
      medication: "Fluticasone",
      dose: {
        value: "1 spray",
        frequency: "daily"
      }
    }
  ],
  tests: [
    {
      test: "Chest X-ray",
      result: "Negative"
    }
  ],
  physical_exam: ["Mild wheezing on auscultation"]
}


/**
 * Generate the text prompt from the patient data 
 * 
 */
export function generate_prompt(patient_data : PatientData ) {
   // Extract patient data fields from the input
  const { demographics, symptoms, lab_values, medical_history, medications, tests, physical_exam } = patient_data;

  // Construct an OpenAI prompt using the extracted data fields
  const prompt = `
    Given the following patient information:
    Demographics: ${JSON.stringify(demographics)}
    Symptoms: ${JSON.stringify(symptoms)}
    Lab values: ${JSON.stringify(lab_values)}
    Medical history: ${JSON.stringify(medical_history)}
    Medications: ${JSON.stringify(medications)}
    Tests: ${JSON.stringify(tests)}
    Physical exam: ${JSON.stringify(physical_exam)}

    Please generate a list of the most likely diagnoses, along with their likelihood and any potential further workup needed to confirm or exclude each diagnosis.
    The returned value should be a stringified JSON object that is an Array of objects that each have  "diagnosis", "likelihood", and "suggested_workup" fields. 
    The suggested_workup field should be an array of strings where each string is a single suggested workup, such as "echocardiogram" or "chest x-ray" or "Basic metabolic panel (BMP)".
    The likelihood field should be a number from 0 to 1 that estimates the probability that this is the diagnosis. 
    The returned array should have atleast 6 elements that are ranked with the highist likelihood first, and should include up to 10 if the 10th would still occur with a reasonable probability. 
  `;

  return prompt ; 
} 

/**
 * Performs AI Clinical Decision support 
 * 
 */
export async function ai_cds(patient_data: PatientData): Promise<ApiResult> {

  let prompt = generate_prompt(patient_data) ; 
  let ddx = await ask_ai(prompt, 2048) ;

  return ddx
}



/**
 * Convert text based one liner and HPI into a patientData object
 * 
 */
export async function generate_patient_data(input: { one_liner: string, hp : string }): Promise<PatientData | null> {
  try {
    // Use the OpenAI API to generate patient data based on the input
    const prompt = `Given the medical one-liner "${input.one_liner}" and History and Physical "${input.hp}", generate a patient_data object which conforms
to the following PatientData type definition in typescript:

type PatientData = {
  demographics: {
    age: number,
    gender?: string,
    ethnicity?: string,
    occupation?: string
  },
  symptoms: string[],
  lab_values: {
    lab : string ,
    value : any 
  }[],
  medical_history: string[],
  medications: {
    medication : string,
    dose : { value : string, frequency : string } 
  }[],
  tests: {
    test: string,
    result: string
  }[],
  physical_exam: string[]
}

The repsonse should be a json string. 
Only include the optional fields in the response if that information is explicity present in the one_liner or hp
Do not include any text in the response other than the json string itself 


EXAMPLE RESPONSE: 

{
  "demographics": {
    "age": 30,
    "gender": "Female",
    "occupation": "Software Engineer"
  },
  "symptoms": ["Fever", "Cough", "Fatigue"],
  "lab_values": [
    {
      "lab": "Magnesium",
      "value": 1.5
    },
    {
      "lab": "Calcium",
      "value": 9.2
    },
    {
      "lab": "Potassium",
      "value": 4.0
    },
    {
      "lab": "Sodium",
      "value": 138
    }
  ],
  "medical_history": ["Asthma", "Seasonal Allergies"],
  "medications": [
    {
      "medication": "Albuterol",
      "dose": {
        "value": "2 puffs",
        "frequency": "as needed"
      }
    },
    {
      "medication": "Fluticasone",
      "dose": {
        "value": "1 spray",
        "frequency": "daily"
      }
    }
  ],
  "tests": [
    {
      "test": "Chest X-ray",
      "result": "Negative"
    }
  ],
  "physical_exam": ["Mild wheezing on auscultation"]
}
`
    let api_result = await ask_ai(prompt, 2048) ;
    /*
      Todo: check api_result.error and if true handle the UI :) 
    */ 
    var patient_data = (api_result.data as PatientData) ; 
    return patient_data;

    
  } catch (error) {
    debug.log(`An error occurred`)
    debug.add('generate_error' , error)
    return null ; 
  }
}

