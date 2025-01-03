import * as tsw from "tidyscripts_web";
import * as fbu from "./firebase_utils"
import * as fb from "./firebase"
import * as ride_res from "./ride_resources"

const log = tsw.common.logger.get_logger({id:'rpu'})
const debug = tsw.common.util.debug
const fp =  tsw.common.fp

/*
 * Utility file for RIDE prompting  (Repository based Inference for Domain Specific Evaluation) 
 */

export var handoff_ride_template = `
Your goal is to generate a patient handoff based on the information given to you. 

The handoff is a concise summary of the patient and their active problems. Its purpose is to quickly inform a covering provider about the patient, assuming that they have never met or chart reviewed the patient before. Thus, it should include pertinent information and exclude extraneous information, so as to optimize the transfer of essential information to the cross covering physician in a timely manner.

The structure of the handoff consists first of the one-liner, which is a single sentence that summarizes the patient’s age, sex, medical comorbidities (often in a comma separated list), reason for presentation and optionally current status or diagnosis.

The one liner is followed by one or more diagnosis groups, which are the diagnoses being actively treated by the care team, ideally ranked in order of importance.

Each diagnosis group follows the same format. Each has three sections. The first section consists of one line for each diagnosis in the diagnosis group. 

The second section consists of a concise and brief narrative summary of the diagnoses in the group, including objective data (vitals, labs, imaging, physical exam, findings, history) that support the diagnoses or which provide critical supplemental or clarifying information relating to the diagnoses.

The third and final section consists of one line for each aspect of the plan for this diagnosis group. 
Each line describes a management action being taken for this diagnosis group. This includes information regarding ordered or held medication’s, imaging or consults to be obtained, surgeries or procedures to be done, or any other plan being taken or awaited by the primary team.

Much of the time, if not most of the time, a diagnosis group consists of a single diagnosis. However, if multiple diagnoses can be grouped together for efficiency and conciseness, this is preferred. This is especially true for diagnoses that share objective data and management plans.` 


export var example_section =`
Here are some examples that will help you understand how to perform the task well: 

# BEGIN EXAMPLES 

{domain_specific_examples}

# END EXAMPLES 
`

export var ride_prompt_template = ` 

{domain_specific_prompt} 

${example_section} 

# BEGIN TASK 

Here is the input for your task: 

# BEGIN INPUT

{input}

# END INPUT 

Now please generate an accurate output for the above input in your response. 
`

interface BRP_OPS {
    domain_specific_prompt : string,
    domain_specific_examples : object[] ,
    input  : string ,
    //todo-- update ops to account for example section
} 


/*
 * Builds the final RIDE prompt  
 */
export function build_ride_prompt( ops : BRP_OPS ) {
    let {domain_specific_prompt , domain_specific_examples, input } = ops ;
    let example_text = build_example_text(domain_specific_examples) ;
    let final_prompt = ride_prompt_template.replace("{domain_specific_prompt}", domain_specific_prompt).replace("{domain_specific_examples}", example_text).replace("{input}", input)
    debug.add('final_prompt' , final_prompt)
    return final_prompt 
}


/*
 * Converts the TRAIN array into text that can be inserted into a prompt 
 */
export function build_example_text(dse : object[]) {
    // @ts-ignore 
    return fp.map_indexed( (i:number,val:any) => train_example_to_text(val, i) , dse ).join("")
} 

/*
 * Converts one example into the corresponding text 
 */
export function train_example_to_text(example : any, index : number ) {
    return `
## EXAMPLE ${index}

INPUT:
-----

${example.input}

OUTPUT:
------

${example.output} 

`
} 

export var ap_to_handoff_profile = {
    app_id : "autocare" ,
    path   : ["train" , "ap_to_handoff"] ,
    domain_specific_prompt : handoff_ride_template ,
    response_format : ride_res.Handoff_Response_Format ,
    post_processing_fn : function( structured_format : any ) {
	//the structure is  { one_liner , diagnosis_groups : [  {diagnoses , plan_items}  ]
	let {one_liner, diagnosis_groups } = structured_format

	let rendered_groups = diagnosis_groups.map( (dg:any) =>
	    //sorry for this jumbled code :/ 
	    ( dg.diagnoses.map( (dx:string)=> `#${dx}` ).join("\n") + "\n" + dg.plan_items.map( (i:string) => `- ${i}`).join("\n") )
	).join("\n\n")
	
	return `ID: ${one_liner}\n\n${rendered_groups}`
    }
    
} 

export var profiles = {
    ap_to_handoff : ap_to_handoff_profile    , 
} 

export var test_handoff_ride_args = {
    ... ap_to_handoff_profile ,
    ... { input : ride_res.test_ap_1 }
}


//function for building llm args from prompt and response_format 
function get_llm_args(prompt : string, response_format : any) {
    return { 
	model : 'gpt-4o-mini-2024-07-18' ,
	messages : [ {role : 'system' , content : 'you are an expert medical assistant'} , { role : 'user', content : prompt } ] , 
	response_format
    }
}

// ---- 
export interface RIDE_ARGS {
    app_id  : string, 
    path : string[] , //path from which to download the TRAIN examples 
    domain_specific_prompt : string, //domain specific template
    input : string, //input to be passed for inference
    response_format : string, //output format for the AI response
    post_processing_fn?  : any , //optional post processing function which will transform the output 
}

/*
 * CHECKS the RIDE Inference
 * Retrieves the training examples from APP_ID and PATH 
 * Then builds and returns the prompt 
 */
export async function check_ride(ops : RIDE_ARGS) {

    let {app_id, path, domain_specific_prompt, input} = ops ;

    //1. obtain the TRAIN examples
    let domain_specific_examples = (await fbu.get_user_collection({ app_id, path }) ) as any

    log(`Retrieved ${domain_specific_examples.length} examples from ${path} for inclusion into RIDE prompt`)     
    debug.add('domain_specific_examples' , domain_specific_examples) ;

    if (domain_specific_examples.length < 1 ) {
	throw(`Error! there were no examples at path: ${path}`)
    } 

    /*
      2. build the RIDE prompt
       interface BRP_OPS = {
          domain_specific_prompt : string,
          domain_specific_examples : object[] ,
          input  : string
       } 
    */
    let full_prompt = build_ride_prompt( { domain_specific_prompt, domain_specific_examples, input }) ;

    return {full_prompt , domain_specific_examples } 
} 

/*
 * Performs the RIDE Inference
 * Retrieves the training examples from APP_ID and PATH 
 * Then builds and executes the prompt 
 */
export async function go_for_ride(ops : RIDE_ARGS ) {

    //generate the prompt 
    let ride_check = await check_ride(ops)  ;
    debug.add('ride_check' , ride_check) ;

    //now run the prompt
    //almost there except we need to pass the llm_args with the RIDE_OPS; including
    //the response FORMAT (which is going to be different for each TRAIN/RIDE scenario)
    let {response_format} = ops ; 
    let {full_prompt } = ride_check ; 
    let llm_args = get_llm_args( full_prompt, response_format ) ;
    
    // use fb.chat_completion( )  to get the result
    let response = await fb.chat_completion(llm_args)
    debug.add('ride.response' , response) 
    let result = response 
    if (ops.post_processing_fn )  {
	log(`Detected and running post_processing_fn`) 
	result = await ops.post_processing_fn(response)
	debug.add('ride.result' , result ) 
    } 
    return { result , response, ride_check } 
    
}

