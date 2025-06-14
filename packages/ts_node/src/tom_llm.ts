import * as common from "tidyscripts_common"
const {ailand} = common.apis ;
const {embedding1024, structured_prompt} = ailand ; 
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

const {debug}  = common.util; 

/* 
 *  LLM UTILS 
 */

export async function extract_entities(text : string, tier : string) {

    let categories = z.enum(["condition", "symptom" , "medication", "procedure", "imaging", "lab test", "diagnostic test", "organ", "organ system", "clinical finding"]) ;

    let lower_case_string = z.string().transform( (str:string)  => str.toLowerCase()) ; 

    let entity_rf = zodTextFormat(
	z.object({
	    'entities' : z.array(z.object( { eid : lower_case_string, category : categories, importance : z.number() } ))
	}), 
	'entities'
    )
	
    let prompt = `
Please extract all entities from the input and categorize them by the correct category. The entity id (or eid) is the the field that stores the name of the entity. Include an importance score that is 0-1 and scores how relevant / important an entity is to the text as a whole

The allowed categories include: condition, symptom , medication, procedure, imaging, lab test, diagnostic test, organ, organ system, clinical finding

If there is no good category for an entity then DO NOT categorize it. 

INPUT: 

${text}

`

    debug.add('entity_prompt' , prompt)     
    let result = await structured_prompt(prompt, entity_rf, (tier || 'top' ) ) as any 
    debug.add('entity_result' , result) 
    return result.entities 
}     



export var example_texts = [
    "Treatment of gastrointestinal (GI) bleeding depends on the source, severity, and patient condition. Initial management focuses on stabilizing the patient with fluid resuscitation, blood transfusions if needed, and correction of coagulopathy. Proton pump inhibitors are often used, especially for upper GI bleeds. Endoscopic intervention is the primary diagnostic and therapeutic tool, allowing for direct visualization and treatment of bleeding lesions through techniques such as clipping, cauterization, or injection. In cases where endoscopy is unsuccessful or not feasible, interventional radiology or surgery may be required. Ongoing monitoring and supportive care are essential to prevent rebleeding and address underlying causes." ,
    ""
] ; 
