/**
 * Helper file for pubmed.ts 
 */

import * as tsc from "tidyscripts_common" ; 
import * as mongo_util from "./mongo/util" ;

const log = tsc.logger.get_logger({id:'pubmed_mongo'}) ; 
  
export var db : any = null ; 


/**
 * Returns the 
 * "pubmed_analysis" client object 
 */
export async function get_local_mongo_client() {
  if (db) { return db } ; 
  let db_name = "pubmed_analysis"
  db = await mongo_util.get_local_client_by_db_name(db_name) ;
  return db ; 
} 

/**
 * Returns the 'articles' collection on localhost 
 */
export async function get_articles_collection() {
  let db = (await get_local_mongo_client()  as any ) ; 
  return db.collection('articles') ; 
}

/**
 * Creates the articles_collection indeces 
 * 
 */
export async function create_articles_indeces()  {
  let coll = await get_articles_collection() ;
  let result1 = await coll.createIndex({ pmid : 1}, { unique : true}) ; 
  let result2 = await coll.createIndex({ date : 1})  ;
  log("Created articles index") ;
  log(result1) ;
  log(result2) ;
} 


