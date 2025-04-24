/**
 * USYNC 
 */

import * as P from "../index" ;
import {read_json, read_dir,path,write_json,ensure_dir} from "../../io" ; 
import {logger,asnc} from "tidyscripts_common" ;

export const log = logger.get_logger({id: "usync"})

export const url   = process.env['USYNC_URL'] as string
export const email = process.env['USYNC_EMAIL'] as string
export const pw    = process.env['USYNC_PW'] as string
export const dir   = process.env['USYNC_DIR'] as string

export const config  = { url, email, pw, dir }


/* helpers */
const element_map = { 
    email_field : '#login-email', 
    pw_field    : '#login-password', 
    btn         : '#login_btn'
}

export async function loaded(p: any) {
    try {
	await p.waitForNetworkIdle({idleTime: 600, timeout : 10000})
	log(`Loaded`) 
    } catch (e :any ) {
	log(`Timeout!`)
    }

}

/* main */ 
export async function main() {
    // - init
    var info = init()
    const {already_synced} = info ; 
    // - launch
    var {p,b} = await launch() 
    // - login
    await login(p) ;
    // - return page

    // launch
    log('launch')
    await p.evaluate( ()=> document.querySelector<HTMLElement>("#BtnLaunch13684941")!.click() )
    await loaded(p) ; await asnc.wait(5000) ; 

    //dropdown
    log('dropdown')    
    await p.evaluate( ()=> document.querySelector<HTMLElement>("mat-nav-list mat-list-item:nth-child(4) a")!.click() )
    await asnc.wait(2000)

    //click
    log('click')    
    await p.evaluate( ()=> document.querySelector<HTMLElement>("mat-nav-list mat-list-item:nth-child(4) mat-list-item:nth-child(2) a")!.click() )
    await asnc.wait(2000)

    //now we are here
    //for each row we check its name and see if it has been downloaded
    //first we build a list of which rows will be synced
    //after this we run process_row() on each row that needs to be synced
    log('assess')        
    let to_be_synced = await p.evaluate( (already_synced : string[])=> {
	//get_rows	
	let rs = Array.from(document.querySelectorAll("tbody tr")) ; 
	let tmp = [ ]  ; 
	for (var i=0; i< rs.length ; i ++) {

	    let name = rs[i].querySelector( "td:nth-child(2)" )!.textContent!.trim()
	    if (already_synced.includes(name)) {
	    } else {
		tmp.push( {row: i, name } )
	    }
	}
	return tmp 

    }, already_synced )
    log(`The following need to be synced: ${JSON.stringify(to_be_synced)}`)
    
    return {p , to_be_synced} 
    
}

export async function get_rows(p : any)  {
    
    let all_rows = await p.evaluate( ()=> {
	//get_rows	
	let rs = Array.from(document.querySelectorAll("tbody tr")) ; 
	let tmp = [ ]  ; 
	for (var i=0; i< rs.length ; i ++) {

	    let name = rs[i].querySelector( "td:nth-child(2)" )!.textContent!.trim()
	    tmp.push( {row: i, name } )

	}
	return tmp 

    } ) ;

    return all_rows 

}

export async function sync(p : any , to_be_synced : any) {
    log(`Syncing ${JSON.stringify(to_be_synced)}`)  ;
    for (var i = 0 ; i < to_be_synced.length ; i ++  ) {
	let {row, name } = to_be_synced[i] ;
	log(`Processing=> row=${row}, t_num=${name}`)  ;
	await process_row(p , row)
	log(`Done!`) ;
	await asnc.wait(6000) ; 
    } 
} 


//select qb row 
export async function activate_row(p: any, i : number) {
    await p.evaluate((i:number)=>{
	//get_rows	
	let rs = Array.from(document.querySelectorAll<HTMLElement>("tbody tr")) ; 
	rs[i].querySelector<HTMLElement>(`td:nth-child(9) p:nth-child(2) i`)!.click()
    },i)

    await asnc.wait(3000)

    await p.evaluate(()=>{
	document.querySelector<HTMLElement>(".review-button")!.click()
    })
    
}

export async function row_info(p: any, i : number) {
    return await p.evaluate((i:number)=>{
	//get_rows	
	let rs = Array.from(document.querySelectorAll<HTMLElement>("tbody tr")) ; 
	return rs[i]!.innerText
    },i)
}

export async function deactivate_row(p : any) {
    await p.goBack() ; await asnc.wait(4000) ;
    await p.goBack() ;
}

export async function get_row_data(p : any , i : number ) {
    // -
    log(`Getting info`)
    var t_info = await row_info(p, i) ; await asnc.wait(1000+Math.random()*1000) ; 
    
    log(`activating`); await activate_row(p ,i ) ;
    let wait_t1 = 6000 + Math.random()*4000
    log(`random waiting for: ${wait_t1} ms`)  ; 
    await asnc.wait(wait_t1) ;
    // - 
    log(`review`); await go_to_review_page(p) ; await asnc.wait(2000 + Math.random()*2000) ;
    log(`#`); var num_q = await get_num_questions(p)  ; await asnc.wait(1000+Math.random()*1000);  log(`num_q=${num_q}`) ;
    // - 
    var t_data  = [ ] 
    log(`0`); await select_nth_q(p,0) ; await asnc.wait(4000) ;
    for (var x=0; x< num_q ; x++) {
	let content  = await p.content() ;
	let meta     = await get_q_metadata(p)   ;
	let data = {content, meta }
	log(`got data for ${JSON.stringify(meta)}`) 
	t_data.push(data) ;
	await next(p) ;
	let wait_t = 5000 + Math.random()*5000
	log(`random waiting for: ${wait_t} ms`)  ; 
	await asnc.wait(wait_t) ; 
    }

    log(`deactivating`) ; await deactivate_row(p) ; await asnc.wait(4000) ;   

    var result = {t_info , t_data }
    return result 
}


export async function save_row_info(t_num : number, r_data : any) {
    let fdir = path.join(dir,`t${t_num}`) 
    let fpath = path.join(fdir, 'data' )
    log(`Saving row info for t_num: ${t_num} at fpath: ${fpath}`)
    ensure_dir(fdir) ; 
    write_json(fpath, r_data)
    log(`Done`) ; 
}

export async function process_row(p : any , r_num :number ) {
    let r_data = await get_row_data(p, r_num) ;
    let t_num = r_data.t_info.split("\t")[1]!.trim()
    log(`Will save for t_num: ${t_num}`) 
    await save_row_info(t_num , r_data) 
} 





// - go to review page
export async function go_to_review_page(p : any){
    await p.evaluate( ()=> document.querySelector<HTMLElement>('[aria-label="Show Review Page"]')!.click() )
}

// - get number of questions 
export async function get_num_questions(p : any) {
    return await p.evaluate( ()=> document.querySelector<HTMLElement>("table.questionlist")!.children.length )
}

// - select nth q 
export async function select_nth_q(p:any , n : number) {
    return await p.evaluate( (n :number)=> document.querySelector<HTMLElement>("table.questionlist")!.children[n].querySelector<HTMLElement>("span")!.click() , n)
}

// - goto next
export async function next(p : any) {
    await p.evaluate( ()=> document.querySelector<HTMLElement>('[aria-label="Navigate to the next question"]')!.click() )
} 

// - get main content 
export async function get_main_content(p : any ){
    return p.evaluate ( () => document.querySelector<HTMLElement>("#questionInformation")!.innerHTML )
}


// - get metadata 
export async function get_q_metadata(p : any) {
    return await p.evaluate( ()=> {
	return {
	    qid: document.querySelector<HTMLElement>(".layout-header div:nth-child(2) div div:nth-child(2)")!.innerText,
	    num: document.querySelector<HTMLElement>(".layout-header div:nth-child(3) div div:nth-child(2)")!.innerText,
	    tid: document.querySelector<HTMLElement>(".layout-header div:nth-child(2) div div:nth-child(1)")!.innerText, 
	    cat: document.querySelector<HTMLElement>(".layout-header div")!.innerText	    
	} 
    })
}




function init() {
    log(`Initializing with config: ${JSON.stringify(config)}`)
    //check files structure and strip the t from beginning of dir names 
    var already_synced = read_dir(dir as string).map( (x:string)=> x.replace("t","") )
    log(`Already synced=${JSON.stringify(already_synced)}`)
    return { 
	already_synced  
    }
} 

export async function launch() {
    var b = await P.get_browser({
	executablePath : '/usr/bin/google-chrome',
	userDataDir: "./browser-user-data", 
	args: ['--start-maximized']}) ;
    var p = await P.new_page({}) ;  log(`Launched browser and page`)  ;
    return {p,b}
} 

export async function login(p : any) {
    // - go
    await p.goto(url) ; await loaded(p) ; log(`Went to url`) ;
    
    // - populate login field
    await p.type(element_map.email_field, config.email , {delay: 50})
    await p.type(element_map.pw_field   , config.pw ,    {delay: 50})
    log(`Populated login field`) ; await asnc.wait(2000);
    
    // - submit and wait for page load 
    await p.evaluate( (args : any ) => {
	let {element_map , config }  = args; 
	document.querySelector<HTMLElement>(element_map.btn)!.click() 
    }, {element_map, config} ) ; 
    await loaded(p)

    log(`Logged in :)`) 

} 






