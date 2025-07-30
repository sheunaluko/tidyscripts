import node from "../../packages/ts_node/dist/index"
import common from "../../packages/ts_common/dist/index" ;

const {io,tom} = node;
const {path} = io ;
const {dates} = common  ;
import {z} from "zod" ; 
import {zodTextFormat} from 'openai/helpers/zod'  ; 

const get_logger = common.logger.get_logger ; 
const log = get_logger({id: 'tomdev'}) ;


const file_dir = path.join(process.env['TIDYSCRIPTS_DATA_DIR'] as string, "medical_corpus/json") ;  

let welcome_msg = `Hello Shay - Just Keep Going -  \\(^.^)/ Launching TOM`


export async function init() {
    log(welcome_msg) ;
    log(`Using data dir: ${file_dir}`)
    const fdata = load_files() ;
    return fdata 
}      

export async function load_files() {
    
    let fnames = io.read_sorted_full_paths(file_dir) 

    return fnames.map(function(f:string) {
	let data = io.read_json(f) ; 
	return { ... data , source : path.basename(f) }
    })
}

export async function get_db(db_name : string) {
    let ops = {
	url : process.env['SURREAL_DB_URL'] as string,
	database : db_name ,
	auth : {
	    username : process.env['SURREAL_DB_USER'] as string,
	    password : process.env['SURREAL_DB_PW'] as string, 	    
	}
    }
    return await node.apis.surreal.connect_to_surreal(ops)
}

var STUDY_DB : any = null ; 

export async function get_study_db() {
    if (STUDY_DB) { return STUDY_DB } ;
    STUDY_DB = await get_db("study") ;
    return STUDY_DB  
}

export async function create_study_db() {
    let data = await init() ;
    let db = await get_db("study") ;

    for (var d of data ) {
	let fact = d['Educational Objective']  ;
	if (!fact) { continue } ;

	let uid = await common.apis.cryptography.uuid_from_text(fact) ; 
	let to_store = {
	    fact ,
	    id : uid ,
	    metadata : {
		created : new Date()  ,
		questions : [ ]  ,
		stats : [ ] 
	    }
	}

	log(`Processing: ${fact}`)
	await db.query(`
             insert ignore into facts $to_store 
	    `, {to_store}); 
	
    }

}

var RECORD_ID_LIST : any = null ;

export async function get_record_id_list() {
    let study_db  = await get_study_db()
    
    if (RECORD_ID_LIST) { return RECORD_ID_LIST } ;

    let tmp = await study_db.query('select id from facts') as any 
    let ids = tmp[0]

    RECORD_ID_LIST = ids ;
    return (RECORD_ID_LIST  as any[])
}


export async function get_random_study_record() {
    let db  = await get_study_db() 
    let id = common.fp.rand_element( await get_record_id_list() ) ;
    let tmp = await db.query('select * from type::thing("facts", $id)', {id : id.id} ) as any 
    return tmp[0][0] 
}

export async function study() {
    let db = await get_db("study") ;

    // @ts-ignore
    let fs = (await db.query('select * from facts limit 10'))[0] as any;

    let q1 = await generate_question_from_fact(fs[0])  ; 
    
    return {
	db  ,
	fs ,
	q1 
    }
}


export async function generate_question_from_fact(fact_object : any) {
    let {fact,id,metadata} = fact_object ;
    let {questions} = metadata  ;

    let rf = zodTextFormat(
	z.object({
	    question : z.string() ,
	    answer   : z.string() 
    }), 'rf' ) ; 

    let prompt = `
You are an expert study assistant. Your job is to take a medical fact, and any existing questions, and to generate a novel question to test the users knowledge of the fact.

The question should be worded such that the answer should be a single word or simple phrase 

Fact:
${fact}

Existing Questions:
${JSON.stringify(questions)}

Please adhere to the output format  (provide an object with keys question, answer ) 
    `

    return await common.apis.ailand.structured_prompt(prompt , rf, 'top') ; 
    
}




export async function process_question(q : any) {

    const src = q['source']  ;
    
    log(`Processing ${src}`)
    
    const eo  = q['Educational Objective'] ; 

    if (! eo ) {
	log(`Missing edu obj for ${src} so skipping`) ;
	return null 
    }

    // - simply ingest text with the q as the metadata and eo as text
    await tom.ingest_text(eo, q )  ;

    log(`Done with ${src}`) 
}

export async function with_time( f : any ) {
    let ts = dates.ms_now() ;
    log(`tstart=${ts}`)
    let result = await f() ;
    let te = dates.ms_now() ;
    let min = (te-ts)/1000/60 ; 
    log(`tend=${te}, total min=${min}`); 
    return {ts,te,min, result} 
}

export async function process_num(n : number  ) {
    
    const data = await init() ;
    
    let fn =  async () => {

	var errors = [ ] 
	
	for ( var q of ( data.slice(0,n) ) ) {
	    try {
		let result = await process_question(q)
	    } catch (e : any)  {
		log(`Error with ${q.source}`); 
		errors.push( [q,e] ) ; 
	    }
	}

	return errors  
    }

    return await with_time(fn)  ; 
}

export async function process_all() {
    const data = await init() ;
    
    let fn =  async () => {

	var errors = [ ] 
	
	for ( var q of ( data ) ) {
	    try {
		let result = await process_question(q)
	    } catch (e : any)  {
		log(`Error with ${q.source}`); 
		errors.push( [q,e] ) ; 
	    }
	}

	return errors  
    }

    return await with_time(fn)  ; 
}
