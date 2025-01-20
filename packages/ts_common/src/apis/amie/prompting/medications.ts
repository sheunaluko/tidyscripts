/**
 * Collection of prompts and response formats used by the medications engine
 * @packageDocumentation
 */

import { zodResponseFormat } from 'openai/helpers/zod' ;
import { z } from "zod" ;

export const patient_information_placeholder = '{patientInformation}'
export const supplementary_information_placeholder = '{supplementaryInformation}' 

/**
 * Define the medication extraction prompt
 */
export var medication_extraction_prompt = ` 
You are an expert clinical decision support pharmacist that identifies medications within a patient patientInformationn text and providesextracts the medications along with supplemental data in structured format.  

<patientInformation> 
${patient_information_placeholder} 
</patientInformation> 

Your json output consists of an array of medication objects. 
Each objects contains the fields: name, medication_class, intended_effects, adverse_effects , interacts_with_medication , interacts_with_class. 
name is the name of the medication. 
medication_class is the medication's class or pharmacologic category 
intended_effects is a list of the intended effect of the medication. 
adverse_effects is a list of the most common adverse effects of the medication.
interacts_with_medication is a short list of the medications which can interact with this medication to create a dangerous effect. 
interacts_with_class is a short list of the medication classes which can interact with this medication to create a dangerous effect.  

Do not guess or extrapolate. 
`

let medication_extraction_response_object = z.object({
    name             : z.string(),
    medication_class : z.string(), 
    intended_effects : z.array(z.string()) ,
    adverse_effects  : z.array(z.string()) ,
    interacts_with_medication  : z.array(z.string()) ,
    interacts_with_class       : z.array(z.string()) , 
})

let xrf = z.object( { data : z.array( medication_extraction_response_object ) } ) 
    
export var medication_extraction_response_format = zodResponseFormat(  xrf  , 'medication_extraction' )

export var extraction = {
       prompt : medication_extraction_prompt,
       rf     : medication_extraction_response_format
}

export var medication_evaluation_prompt = `
You are an expert clinical decision support pharmacist that provides unique and valuable feedback to the user. 
You focus on identifying medication adverse effects and interactions that should be noted.
Carefully consider this patient and supplementary information:

<patientInformation> 
${patient_information_placeholder}
</patientInformation> 

<supplementaryInformation> 
${supplementary_information_placeholder}
</supplementaryInformation> 

Provide a list of recommendations for the user in the following format:

The json output consists of an array of recommendation objects. 
Each object contains the fields: action, data, reasoning, caveat. 
action is one of the following: start, stop, increase, decrease 
data is the name of the medication 
reasoning is a concise explanation of your thought process 
caveat is additional information that should be taken into consideration, or an alternative viewpoint 

Do not recommend actions that that the user is already taking. 
`

export var medication_evaluation_prompt_without_supplementary_data = `
You are an expert clinical decision support pharmacist that provides unique and valuable feedback to the user. 
You focus on identifying medication adverse effects and interactions that should be noted.
Carefully consider this patient and supplementary information:

<patientInformation> 
${patient_information_placeholder}
</patientInformation> 

Provide a list of recommendations for the user in the following format:

The json output consists of an array of recommendation objects. 
Each object contains the fields: action, data, reasoning, caveat. 
action is one of the following: start, stop, increase, decrease 
data is the name of the medication 
reasoning is a concise explanation of your thought process 
caveat is additional information that should be taken into consideration, or an alternative viewpoint 

Do not recommend actions that that the user is already taking. 
`

let medication_evaluation_response_object = z.object({
    action    : z.string(),
    data      : z.string(),
    reasoning : z.string(),
    caveat    : z.string(),         
})

let vrf = z.object( { data : z.array ( medication_evaluation_response_object ) } ) 

export var medication_evaluation_response_format = zodResponseFormat( vrf  , 'medication_extraction' ) 

export var evaluation = {
       prompt : medication_evaluation_prompt,
       rf     : medication_evaluation_response_format
}

export var evaluation_without_supplementary_data = {
       prompt : medication_evaluation_prompt_without_supplementary_data,
       rf     : medication_evaluation_response_format
}



