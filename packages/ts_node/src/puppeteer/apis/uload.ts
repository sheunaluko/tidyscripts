/* - - - */
import {read_json, read_dir,path,write_json,ensure_dir} from "../../io" ; 
import {logger,asnc} from "tidyscripts_common" ;

import * as apis from "../../apis/index" ; 

const {Firestore, Timestamp} = apis.firestore 

const log = logger.get_logger({'id': 'uload'}) ; 
export const dir     = process.env['USYNC_DIR'] as string ;
export const lpath   = process.env['USYNC_LOAD_PATH'] as string ;


export var fire : any = null ; 

export async function init() {
    log(`Getting firestore reference`)
    fire = new Firestore()
    log(`Initializing with dir: ${dir}`); 
    let folders = read_dir(dir) 
    log(`Found folders: ${JSON.stringify(folders)}`)
    let t_nums = folders.map( (f:string)=> Number(f.replace("t","").trim()) )
    log(`t_nums : ${JSON.stringify(t_nums)}`)
    log(`Checking last synced t_num...`)
    let last_t_num = (await check_last_t_num() as number  ) 
    log(`last t_num=${last_t_num}`) ;
    let to_sync = t_nums.filter( (t:number) => (t > last_t_num) );
    log(`To sync= ${JSON.stringify(to_sync)}`)

    await asnc.wait(5000) ;

    log(`Syncing ;)`)
    for (var y of to_sync) {
	await store_n(y)
	await asnc.wait(5000); 
    }

    log(`Done syncing! :)`)    
} 

export async function check_last_t_num() {
    let c  = await fire.collection(lpath);
    let ss = await c.orderBy('t_num','desc').limit(1).get()
    return ss.docs[0].data().t_num 
}



export function get_fname(n : number) { return path.join(dir, `t${n}` , `data.json`) }


export function process_n(n:number) {
    let fname = get_fname(n) ;
    log(`Processing: ${fname}`) ;

    let data = read_json(fname) ;
    let {t_info , t_data  } = data ;
    let t_date = Timestamp.fromDate(new Date(t_info.split("\t")[2]))
    let t_num  = Number(t_info.split("\t")[1].trim()) ;

    return t_data.map( (i : any) => {
	//each i has {content , meta}
	//basically just merging/rearranging
	let q_num  = Number(i.meta.num.match( /Question?(.*)of/)[1].trim())	
	return {
	    ... i.meta ,
	    ... { content : i.content ,
		  q_num , 
		  t_date,
		  t_num , 
		  t_info } 
	} 
    })
}

export async function store_n(n:number) {
    log(`Storing for n=${n}`) ;    
    let data = process_n(n) ;
    for (var o of data) {
	await store_o(o) ; 
    }
}

export function get_id(o :any) { return `t${o.t_num}_q${o.q_num}` }

export async function store_o(o :any) {
    let id = get_id(o);
    log(`Storing: ${id}`)
    await fire.collection(lpath).doc(id).set(o) 
    log(`Done`)
}

export async function test_store() {
    let data = {
	'a' : 20 
    } ;
    let test_id = "heyeye" ;
    log(`Setting`) 
    await fire.collection(lpath).doc(test_id).set(data) 
    log(`Done`)
    
}












