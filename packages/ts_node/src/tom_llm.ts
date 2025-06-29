import * as common from "tidyscripts_common"
const {ailand} = common.apis ;
const {embedding1024, structured_prompt} = ailand ; 
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

const {debug}  = common.util;

const log = common.logger.get_logger({id : 'tlm'}); 

/* 
 *  LLM UTILS 
 */

const  lower_case_string = z.string().transform( (str:string)  => str.toLowerCase()) ;

export async function extract_entities(text : string, tier : string) {

    let categories = z.enum(["condition", "symptom" , "medication", "procedure", "imaging", "lab test", "diagnostic test", "organ", "organ system", "clinical finding"]) ;

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






export async function extract_relations(text : string, entities : any , tier : string) {


    log(`fn::extract_relations`) ;

    log(`building output format`)
    let relations_rf = zodTextFormat(
	z.object({
	    'relations' : z.array(z.object( { name : lower_case_string,
					      source : lower_case_string,
					      target : lower_case_string } ))
	})  , 
	'relations'
    )

    log(`rendering entities as text`)
    let rendered_entities = entities.map( (e:any)=> JSON.stringify(e) ).join("\n\n")
    
	
    let prompt = `
You are provided with input text and a list of entities within this text. Your job is to understand and extract the relationships between the entities, as described by the input text.

Remember to think about hierarchical relations like "subtype of" 

You will provide your output in the form of a relation object, which has the following fields:
name: the name of the relationsip, such as "causes" or "associated with" or "prevents"
source: the source entity of the relation
source: the target entity of the relation

Make sure source and target use the exact format as provided in the entities object shown below. 

Focus only on the following entities:

ENTITIES OF INTEREST:
---
${rendered_entities}
---

Here is the input text:

INPUT:
---
${text}
---`
    
    debug.add('relation_prompt' , prompt)     
    let result = await structured_prompt(prompt, relations_rf, (tier || 'top' ) ) as any 
    debug.add('relation_result' , result) 
    return result.relations
}     





export async function think_about_db_query( tier : string) {
    
    let rf = zodTextFormat(
	z.object({
	    'query' : z.string() 
	}), 
	'query'
    )
	
    let prompt = `

Your job is to create typescript code that performs interesting queries on a qdrant database.

The database is imported like this:
import {QdrantClient} from '@qdrant/js-client-rest';

The code for the qdrant is actually in the current directory, so you can explore it to understand how to use the imported object.


You have access to a database collection (called "tom" ) that consists of "entities":

export interface Entity  {
    kind : 'entity',
    category : string , 
    eid : string ,
    vectors : {
        primary : number[] ,    //the vector embedding of the eid 
        secondary : number[] ,  //the vector embedding of the category
    }
 }

and to "relations":

interface Relation {
    kind : 'relation',
    name : string,     
    source_eid :  string,
    dest_eid :  string ,
    rid : string,  // rid is composed of the concatenated string name:: (source_eid) -> (dest_eid)
    vectors : {
        primary : number[] ,   //the vector embedding of the name
        secondary : number[] , //the vector embedding of the rid
    }


}

-

The relations specify (by their "name" field) the type of relationship between the source Entity with eid=source_eid and the destination entity (eid=dest_eid).

Vector embeddings of the corresponding fields are included as described, to aid with semantic searching and 

`

    debug.add('query_prompt' , prompt)     
    let result = await structured_prompt(prompt, rf, (tier || 'top' ) ) as any 
    debug.add('query_result' , result) 
    return result.query 
}     




















export var example_texts = [
    "Treatment of gastrointestinal (GI) bleeding depends on the source, severity, and patient condition. Initial management focuses on stabilizing the patient with fluid resuscitation, blood transfusions if needed, and correction of coagulopathy. Proton pump inhibitors are often used, especially for upper GI bleeds. Endoscopic intervention is the primary diagnostic and therapeutic tool, allowing for direct visualization and treatment of bleeding lesions through techniques such as clipping, cauterization, or injection. In cases where endoscopy is unsuccessful or not feasible, interventional radiology or surgery may be required. Ongoing monitoring and supportive care are essential to prevent rebleeding and address underlying causes." ,
    ""
] ; 



