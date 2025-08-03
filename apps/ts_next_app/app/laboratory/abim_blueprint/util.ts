import * as common from "tidyscripts_common"
import { z } from "zod" ;
import { zodResponseFormat } from 'openai/helpers/zod' ; 
import * as fb  from "../../../src/firebase";

const log = common.logger.get_logger({ id: "abim_util" });
const {debug} = common.util ;

const abim_client = fb.create_wrapped_structured_client({
    app_id : "abim" ,
    origin_id : "abim_dashboard"  ,
    log 
})

const topic_replace_string = "@TOPIC@" ; 

let abim_topic_template = `
You are an expert medical information provider
You are assisting with extremely high yield study review

Keep in mind that your job is to provide the HIGHEST YIELD INFORMATION for QUICK and EFFICIENT review

You will be provided with a topic

If the topic is a single disease entity, then you should provide

name: name of entity 
presentation: key features of presentation
diagnosis: key diagnostic methods
first_line:  1st line treatment
second_line: 2nd line treatment or other treatments

Remember that this should be extremely CONCISE and should be readable in about 10 seconds

You will return an array of the single entity

If instead the topic represents a SET of entities, then you should first determine the highest yield entities
in the group and then generate the fields above for EACH entity

You will return an array of all generated entities

Here is the topic:
${topic_replace_string}
`

// Individual medical condition schema
const MedicalConditionSchema = z.object({
    name: z.string().min(1, "Condition name is required"),
    presentation: z.string().min(1, "Clinical presentation is required"),
    diagnosis: z.string().min(1, "Diagnostic approach is required"),
    first_line: z.string().min(1, "First-line treatment is required"),
    second_line: z.string().min(1, "Second-line treatment is required")
});

// Array of medical conditions schema
const MedicalConditionsArraySchema = z.object({ 'conditions' : z.array(MedicalConditionSchema) }) ; 


export async function handle_topic_request(topic: string) {

    const prompt = abim_topic_template
	.replace(topic_replace_string, topic)

    debug.add("abim_prompt", prompt) ;

    let response_format = zodResponseFormat( MedicalConditionsArraySchema, 'conditions' ) 

    let args = {
	model : 'gpt-4o' , 
	messages : [ {role : 'system' , content : 'you are an expert medical assistant'} , { role : 'user' , content : prompt } ] ,
	response_format
    }
    
    // -- query the AI with the prompt
    // note that this wraps/mimics the structured completion endpoint 
    const _response = await abim_client.beta.chat.completions.parse(args)

    log("Received abim topic response")
    debug.add("topic_response" , _response) ;
    
    const response = JSON.parse(_response.choices[0].message.content) ;
    
    //response should actually be the structured json content now 	
    debug.add("parsed_response" , response) ;

    return response 

}

