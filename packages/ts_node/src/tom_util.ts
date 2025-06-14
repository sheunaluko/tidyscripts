import * as common from "tidyscripts_common" 
import crypto from "crypto" 

const log = common.logger.get_logger({id : 'tutil' }) ;
const {ailand} = common.apis ;
const {embedding1024, structured_prompt} = ailand ; 

const {debug}  = common.util;

export async function check_for_eid(eid : string, client : any ) {

    /* need to search for eid match */

    /*
       Need to filter by payload only 

     */

    let res  = await client.query("tom", {  filter : { must : [ { key : 'eid' , match  :  { value : eid }}]}});
    debug.add("check_for_eid_res", res) ;
    if (res && res.points && (res.points.length > 0 ) )  {
	log(`Found eid match for ${eid}`)
	return true 
    } else {
	log(`Missing eid match for ${eid}`)	
	return false 
    }
    
}

export function eid_to_uuid(eid : string) {
    return common.apis.cryptography.uuid_from_text(eid) ; 
}

export interface Entity  {
    kind : 'entity',
    category : string , 
    eid : string ,
 }

export interface EntityWithEmbeddings extends Entity {
    eid_vector : number[]  ,
    category_vector : number[]  ,     
}


export async function add_embeddings( e : Entity ) : Promise<EntityWithEmbeddings> {
    let {eid, category} = e ;
    log(`Calculating Embedding(eid) for ${eid}`)
    let eid_vector = await embedding1024(eid) ;
    log(`Calculating Embedding(category) for ${eid}`)    
    let category_vector = await embedding1024(category) ;     
    log(`Done`) ;
    let result = {
	... e, eid_vector, category_vector 
    }
    debug.add('add_embed_result' , result) ; 

    return result
} 


export async function entity_exists(e : Entity, client : any) {
    let {eid} = e ;
    let eid_present = await check_for_eid(eid, client) ;
    if (eid_present ) {
	//there are matches
	log("entity match found")
	return true 
    } else {
	//no matches
	log("no entity match found")
	return false 
    }
}
