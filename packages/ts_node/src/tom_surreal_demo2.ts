/**
 * tom_surreal_demo.ts
 * ------------------
 * Provides a `demo()` function that exercises the tom_surreal_v3 library
 * with logging at each step.
 */
import * as tom_surreal from './tom_surreal_v3';
import * as common       from 'tidyscripts_common';
const log   = common.logger.get_logger({ id: 'tom-surreal-demo2' });
const { ailand } = common.apis;
const {debug } = common.util ; 
/**
 * Run the demo script. 
 * Notes: ensure that  process.env['SURREAL_DB_URL']  is set 
 *
 * Steps:
 *  0) Pass topic from demo(topic : string) or default is tachycardia induced cardiomyopathy 
 *  1) Retrieve client
 *  2) Use AI to generate educational text on the topic
 *  3) Ingest the text (into entities and relations) and store in the database 
 *  4) Retrieve all entities from the db  
 */


export async function demo(t : string): Promise<void> {

    let topic = (t || "tachycardia induced cardiomyopathy" )  ;
    
    log(`[Demo] (0) Topic=${topic}...`);  

    log('[Demo] (1) Getting client...');

    let client;
    try {
	client = await tom_surreal._internals.get_client();
	log('✔ Connected');
    } catch (err: any) {
	log(`✖ Connection/init failed: ${err.message || err}`);
	return;
    }


    log('[Demo] (2) Generating learning text...');
    let prompt = `Generate a 200 word paragraph teaching about the following topic: ${topic}`
    debug.add('prompt', prompt) 
    let text = await ailand.prompt(prompt, 'top' )

    log('[Demo] (3) Processing Test Ingestion...');

    const { added_entities, added_relations } = await tom_surreal.ingest_text_with_summary(text);
    
    log('✔ Added entities:')
    log(added_entities.map((e:any) => e.eid))
    log('✔ Added relations:')
    log(added_relations.map((r: any) => r.rid))

    log('[Demo] (4) Querying all entities...');
    const allEntities = (await tom_surreal.queries.getAllEntities()) as any[];
    log(allEntities) 

    log('✔  DEMO complete :) ');
}
