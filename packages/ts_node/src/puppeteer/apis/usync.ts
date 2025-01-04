/**
 * USYNC 
 */

import * as P from "../index" ;
import {read_json} from "../../io" ; 
import {logger,asnc} from "tidyscripts_common" ;

export const log = logger.get_logger({id: "usync"})

export const url   = process.env['USYNC_URL']
export const email = process.env['USYNC_EMAIL']
export const pw    = process.env['USYNC_PW']
export const dir   = process.env['USYNC_DIR']

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
    init() 
    // - launch
    var {p,b} = await launch() 
    // - login
    await login(p) ;
    // - return page

    // launch
    log('launch')
    await p.evaluate( ()=> document.querySelector<HTMLElement>("#BtnLaunch13684941").click() )
    await asnc.wait(2000)

    //dropdown
    log('dropdown')    
    await p.evaluate( ()=> document.querySelector<HTMLElement>("mat-nav-list mat-list-item:nth-child(4) a").click() )
    await asnc.wait(2000)

    //click
    log('click')    
    await p.evaluate( ()=> document.querySelector<HTMLElement>("mat-nav-list mat-list-item:nth-child(4) mat-list-item:nth-child(2) a").click() )
    await asnc.wait(2000)

    //now we are here
    //for each row we check its name and see if it has been downloaded
    //first we build a list of which rows will be synced
    //after this we run sync_row() on each row that needs to be synced
    let already_synced  = ["4", "5", "6"]

    log('assess')        
    let to_be_synced = await p.evaluate( (already_synced : string[])=> {
	//get_rows	
	let rs = Array.from(document.querySelectorAll("tbody tr")) ; 
	let tmp = [ ]  ; 
	for (var i=0; i< rs.length ; i ++) {

	    let name = rs[i].querySelector( "td:nth-child(2)" ).textContent.trim()
	    if (already_synced.includes(name)) {
	    } else {
		tmp.push( {row: i, name } )
	    }
	}
	return tmp 

    }, already_synced )
    log(`The following need to be synced: ${JSON.stringify(to_be_synced)}`)


    
    
    return p 
    
}

/*
   Todo: put the below functions together to complete the task 
   consider adding in some validation like on_review_page or on_question_n()
 */


//select qb row 
export async function activate_row(p: any, i : number) {
    return await p.evaluate((i:number)=>{
	//get_rows	
	let rs = Array.from(document.querySelectorAll<HTMLElement>("tbody tr")) ; 
	rs[i].querySelector<HTMLElement>(`td:nth-child(${i}) i`).click()
    },i)
}

// - go to review page
export async function go_to_review_page(p : any){
    await p.evaluate( ()=> document.querySelector<HTMLElement>('[aria-label="Show Review Page"]').click() )
}

// - get number of questions 
export async function get_num_questions(p : any) {
    return await p.evaluate( ()=> document.querySelector<HTMLElement>("table.questionlist").children.length )
}

// - select nth q 
export async function select_nth_q(p:any , n : number) {
    return await p.evaluate( (n :number)=> document.querySelector<HTMLElement>("table.questionlist").children[n].querySelector<HTMLElement>("span").click() , n)
}

// - get main content 
export async function get_main_content(p : any ){
    return p.evaluate ( () => document.querySelector<HTMLElement>("#questionInformation").innerHTML )
}


// - get metadata 
export async function get_metadata(p : any) {
    return await p.evaluate( ()=> {
	return {
	    qid: document.querySelector<HTMLElement>(".layout-header div:nth-child(2) div div:nth-child(2)").innerText,
	    num: document.querySelector<HTMLElement>(".layout-header div:nth-child(3) div div:nth-child(2)").innerText,
	    tid: document.querySelector<HTMLElement>(".layout-header div:nth-child(2) div div:nth-child(1)").innerText
	} 
    })
}




function init() { log(`Initializing with config: ${JSON.stringify(config)}`) } 

export async function launch() {
    var b = await P.get_browser({executablePath : '/usr/bin/google-chrome', args: ['--start-maximized']}) ;
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
		document.querySelector(element_map.btn).click() 
	    }, {element_map, config} ) ; 
	    await loaded(p)

	    log(`Logged in :)`) 

	} 






