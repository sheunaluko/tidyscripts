import node from "../../packages/ts_node/dist/index"
import common from "../../packages/ts_common/dist/index" ;

const {io,tom} = node;
const {path} = io ;
const {dates} = common  ; 


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
