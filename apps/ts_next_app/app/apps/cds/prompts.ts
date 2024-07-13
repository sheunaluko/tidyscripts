import * as tsw from "tidyscripts_web";

const debug = tsw.common.util.debug;
const log = tsw.common.logger.get_logger({id : "prompt" })

export const ai_role = "clinical decision support assistant";
export const user = "internal medicine physician";
export const setting = "internal medicine hospital floor";
export const internal_medicine_action_list = `
01. Obtain additional history from the patient
02. Examine the patient with a focused physical exam
03. Obtain lab values (blood work) from the patient
04. Obtain imaging of the patient (chest xray, ct scan, MRI, etc)
05. Start a new medication for the patient
06. Adjust an existing medication for the patient
07. Discontinue (stop) a medication for the patient
08. Provide physical, speech, or occupational therapy for the patient
09. Consult social work for the patient
10. Provide oxygen support for the patient
11. Perform chart review on the patient to obtain additional focused history
12. Obtain additional collateral on the patient from someone who knows them or was with them recently
`;

export const context_of_setting = `
The internal medicine hospital floor is a general medicine floor within a large academic hospital.
Your user is an internal medicine physician who relies on you to provide helpful feedback for managing patient's on the floor.
You review the patients data, including demographics, medical history, outpatient medications, history of present illness, vital signs, current symptoms, active medications, physical exam, laboratory values, imaging data, and other data in order to provided valuable insight to augment the patient's care.
It is very important that you understand the actions that an internal medicine physician can take, since it is only helpful to suggest actions that can be done.

&nbsp;

**List of Internal Medicine Actions**

&nbsp;

REPLACE_internal_medicine_action_list

\n\n
In general the role of an inpatient internal medicine doctor is to review the patients objective data and decide what adjustments (if any) need to be made.

&nbsp;

Here are some **examples**: 

&nbsp;

If a patient is admitted with heart failure and their weight is increasing and their oxygen requirement is increasing, a chest xray should be performed to evaluate for worsening pulmonary edema and an increase in the patient's diuretics should be considered.

&nbsp;

If a patient is admitted with pneumonia and it is day 3 of antibiotics but their pneumonia is worsening on chest xray and they are subjectively feeling worse, repeat sputum cultures or respiratory pathogen panel should be obtained and antibiotics should be broadened to cover more organisms. If the patient is tachycardic or hypotensive blood cultures should be obtained given concern for sepsis and intravenous fluids should be given.
`;

export const general_prompt = `
You are an expert REPLACE_ai_role.
You meticulously review all patient information provided to you and provide useful feedback to the REPLACE_user.
The REPLACE_user is working in a REPLACE_setting and thus all information you provide should be relevant to this setting, including suggestions regarding any actions that the user should take.
In particular, here is a description of the current setting: REPLACE_context_of_setting.
`;

export const general_output_prompt = `
Your output will consist of a LIST of JSON objects with the following fields: action , data,  reasoning, caveat . In general the reasoning you provide should explain your thought process AND also include how the suggested action will change management of the patient.
`;

export const medication_review_prompt = `
Given the medical information provided and all of the other instructions, your job is to provide clinical decision support regarding the patient's medications. Carefully review their outpatient medications, if provided, as well as their active inpatient medications if provided. 

&nbsp;

If any of their medications have interactions with each other that may be affecting their care, you will output this information to the user.

&nbsp;

Here are some **examples**:

&nbsp;

REPLACE_EXAMPLES_medication_review
`;

export const labs_prompt = `
Carefully review all of the laboratory information provided, including electrolyte values, chemistries like lactate (lactic acid), a1c, lipid panel, TSH, hepatic enzymes, and any other lab values that are provided.

Given the medical information provided and all of the other instructions, your job is to suggest additional lab tests that the user should run which have NOT YET BEEN done and which would improve the patients care or elucidate a diagnosis that is not yet clearly elucidated.

&nbsp;

Here are some **examples**: 

&nbsp;

REPLACE_EXAMPLES_labs
`;

export const imaging_prompt = `
Given the medical information provided and all of the other instructions, your job is to provide clinical decision support regarding the patient's imaging. In particular, you will suggest any additional imaging tests (xrays, ct scan, MRI, ultrasound etc) which may aid in the diagnosis of the patient.

&nbsp;

Make sure to specify the exact location and laterality that should be imaged, and ensure to specify the appropriate subtype of imaging, for example a CT scan of the head without contrast (used for detecting bleeds) or a CT Chest with contrast (to evaluate for pulmonary embolism).

&nbsp;

Here are some examples: 

&nbsp;

REPLACE_EXAMPLES_imaging
`;

export const diagnosis_review_prompt = `
Your job is to review the users documented **diagnoses and reasoning**, which is usually contained in the Assessment and Plan section of the documentation.

&nbsp;

If you disagree with a diagnosis in the user's assessment, then you will output the 'reconsider' action and you will explain your reasoning.

&nbsp;

If you agree with a diagnosis you will output the action 'agree' and explain your reasoning.

&nbsp;

You may also suggest adding a diagnosis which you think has been missed. 

&nbsp; 

Here are some examples: 

&nbsp;
 
REPLACE_EXAMPLES_diagnosis_review
`;

export const replacements = {
    ai_role: ai_role,
    user: user,
    setting: setting,
    internal_medicine_action_list: internal_medicine_action_list,
    context_of_setting: context_of_setting,
    general_prompt: general_prompt,
    general_output_prompt: general_output_prompt,
    medication_review_prompt: medication_review_prompt,
    labs_prompt: labs_prompt,
    imaging_prompt: imaging_prompt,
    diagnosis_review_prompt: diagnosis_review_prompt
};

export const examples = {
    medication_review: [
        {
            "action": "adjust medication",
            "data": "Increase the dose of metoprolol from 50mg to 100mg daily.",
            "reasoning": "The patient's blood pressure remains elevated despite the current dose of metoprolol. Increasing the dose may help achieve better blood pressure control.",
            "caveat": "Monitor the patient for signs of bradycardia or hypotension after the dose adjustment."
        },
        {
            "action": "discontinue medication",
            "data": "Stop the use of ibuprofen.",
            "reasoning": "The patient has a history of peptic ulcer disease, and the use of NSAIDs like ibuprofen can exacerbate this condition.",
            "caveat": "Consider alternative pain management options such as acetaminophen."
        },
        {
            "action": "hold medication",
            "data": "Hold the use of lisinopril.",
            "reasoning": "The patient is presenting with hypotension and their outpatient medications include lisinopril, which can cause hypotension.",
            "caveat": "Monitor blood pressure closely and reassess the need for lisinopril after stabilizing the patient's blood pressure."
        },
        {
            "action": "hold medication",
            "data": "Hold the use of lorazepam.",
            "reasoning": "The patient is presenting with altered mental status and their home medications include lorazepam, which can cause or exacerbate altered mental status.",
            "caveat": "Monitor mental status and reassess the need for lorazepam after determining the cause of altered mental status."
        },
        {
            "action": "suggest medication",
            "data": "Initiate the use of albuterol inhaler.",
            "reasoning": "The patient has a history of asthma and is currently experiencing wheezing and shortness of breath, but is not on any bronchodilator therapy.",
            "caveat": "Ensure the patient is educated on the proper use of the inhaler and monitor for any side effects."
        }
    ],
    labs: [
        {
            "action": "obtain lab",
            "data": { "lab_name": "hemoglobin concentration" },
            "reasoning": "The patient presents with GI bleeding however a hemoglobin has not been checked. If it is low then it should be repleted and this will improve the health of the patient.",
            "caveat": "Excessive blood draws in a patient that is bleeding can be detrimental to their health."
        },
        {
            "action": "obtain lab",
            "data": { "lab_name": "haptoglobin" },
            "reasoning": "The patient presents with hemolytic anemia and a haptoglobin has not been checked. If it is low then it will confirm the diagnosis and this will improve the health of the patient.",
            "caveat": "Excessive blood draws in a patient that is anemic can be detrimental to their health."
        }
    ],
    imaging: [
        {
            "action": "obtain imaging",
            "data": {
                "imaging_name": "CT scan",
                "modifiers": "without contrast",
                "location": "head"
            },
            "reasoning": "The patient presents with altered mental status that persists, and suffered a fall. A CT of their head was not done to check for a bleed or other intracranial pathology and should be done now.",
            "caveat": "none"
        }
    ],
    diagnosis_review: [
        {
            "action": "reconsider",
            "data": { "diagnosis": "COPD exacerbation" },
            "reasoning": "The patient does not have shortness of breath nor does he have wheezing on exam.",
            "caveat": "He may have received bronchodilators prior to the physical exam."
        } ,
	        {
            "action": "add",
            "data": { "diagnosis": "Hemolytic anemia" },
            "reasoning": "There is evidence of hemolysis given LDH is high and haptoglobin is low. This in combination with anemia suggests a hemolytic process is taking place.",
            "caveat": ""
        }

    ]
};

export function generate_prompt(prompt : string, _replacements  :any  , _examples : any  , prompt_type  : (string | null) ) {

    log(`Generating prompt with prompt_type: ${prompt_type}`) 
    
    if ( ! _replacements ) {
	_replacements = replacements  
    }

    if ( ! _examples ) {
	_examples = examples   
    } 
    
    let new_prompt = prompt;
    for (const [key, value] of Object.entries(_replacements)) {
	// @ts-ignore 
        new_prompt = new_prompt.replace(new RegExp(`REPLACE_${key}`, 'g'), value);
    }

    let all_examples = _examples[(prompt_type as string)] ;
    debug.add("all_examples", all_examples)     ; 

    if (all_examples) { 
	let stringified_examples = all_examples.map( (e:string) => JSON.stringify( e  , null, 4))
	let examples_string = stringified_examples.join("\n\n") 
	// replace the examples 
	new_prompt = new_prompt.replace(new RegExp(`REPLACE_EXAMPLES_${prompt_type}`, 'g'), examples_string);
    } 

    // a replacement might generate new replacements that need to be processed, so this is handled recursively until the prompt is unchanged 
    if (new_prompt == prompt ) { 
	return new_prompt
    } else {
	return generate_prompt(new_prompt , _replacements , _examples, prompt_type) 
    } 
}


/*
 * Generates the general intro prompt and then the dashboard_specific prompt and combines them 
 * into one large ("full") prompt. 
 */
export function generate_full_prompt(hp : string, prompt_type : string) {
    
    let gen_prompt = generate_prompt(general_prompt, replacements, examples, null )
    let gen_output_prompt = generate_prompt(general_output_prompt, replacements, examples, null )    
    
    let prompt_map :  { [k:string] : string }  = {
	'medication_review' : medication_review_prompt ,
	'labs' : labs_prompt ,
	'imaging' : imaging_prompt, 
	'dianosis_review' : diagnosis_review_prompt
    } 

    var tmp_prompt = prompt_map[prompt_type] 
    
    let spe_prompt = generate_prompt(tmp_prompt, replacements, examples  , prompt_type)
    
    let full_prompt = `
${gen_prompt}

&nbsp;

**Output Information**

${gen_output_prompt}

&nbsp;

**Patient Information** 

-- BEGIN PATIENT HISTORY AND PHYSICAL NOTE -- 

${hp}

-- END PATIENT HISTORY AND PHYSICAL NOTE -- 

&nbsp;

**Specific Instructions** 
${spe_prompt}
    `

    return full_prompt ; 
    
} 

/*
 * Generates a "quicker" prompt that combines multiple dashboards into a single call 
 * 
 */
export function generate_quick_prompt(hp : string, prompt_types : string[] ) {

    log(`Generating quick prompt with types: ${JSON.stringify(prompt_types)}`) 
    
    let gen_prompt = generate_prompt(general_prompt, replacements, examples, null) 
    let gen_output_prompt = generate_prompt(general_output_prompt, replacements, examples, null )    
    
    let prompt_map : { [k:string] : string }  = {
	'medication_review' : medication_review_prompt ,
	'labs' : labs_prompt ,
	'imaging' : imaging_prompt, 
	'diagnosis_review' : diagnosis_review_prompt
    } 

    let specific_prompts = prompt_types.map(
	function(prompt_type : string) {
	    log(`subfunction: ${prompt_types}`) 
	    // get the prompt template
	    let tmp_prompt = prompt_map[prompt_type] ;
	    // generate it
	    return generate_prompt(tmp_prompt, replacements, examples, prompt_type)
	}
    )

    let specific_prompts_string = specific_prompts.join(`
&nbsp; 

In addition to this:

&nbsp; 
    `
    )

    //debug 
    debug.add("specific_prompts", specific_prompts) 

    let full_prompt = `
${gen_prompt}

&nbsp;

**Output Information**

${gen_output_prompt}

&nbsp;

**Patient Information** 

-- BEGIN PATIENT HISTORY AND PHYSICAL NOTE -- 

${hp}

-- END PATIENT HISTORY AND PHYSICAL NOTE -- 

&nbsp;

**Specific Instructions** 
${specific_prompts_string}
    `

    //debug 
    debug.add("full_prompt", full_prompt) 

    return full_prompt ; 
    
} 
