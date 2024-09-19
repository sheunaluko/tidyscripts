import node from "../../packages/ts_node/dist/index";
import common from "../../packages/ts_common/dist/index";

const log = common.logger.get_logger({id : "pup_dev"}) ;

declare var global : any ;

log(`Init pup setup`)

const P = node.puppeteer ;

if (false) { 
    await P.get_browser({})
    const p1 = await P.new_page({})

    let url = "https://coinmarketcap.com"
    log(`Navigating to ${url}`)

    await P.go_and_wait(p1, url)
    let data = await scmc(p1) ;

} 

/*
 * This function takes a puppeteer page and scrolls it to the bottom in increments of 2000 pixels 
 */
export async function scroll_page_to_bottom(page: any) {
    let ht = await page.evaluate( ()=> window.document.body.scrollHeight ) ;
    log(`Page height: ${ht}`)

    let i = 0
    while( i <= ht ) {
	log(`Scrolling to ${i}`) 	
	await page.evaluate( (s:any)=> {window.scrollTo(0, s) }  , i )
	await common.asnc.wait(500) ;
	i += 2000 
    }
    log(`Done`) 
} 

/*
 * This function takes a puppeteer page and scrolls it to the bottom in increments of 2000 pixels 
 * and then waits for the network to be idle  
 */
export async function scroll_to_bottom_and_await_idle(page: any) {
    log("Scrolling page") 
    await scroll_page_to_bottom(page) ;
    log("Waiting for idle network")
    try  { 
	await page.waitForNetworkIdle()
    } catch (e :any) {
	log(`Error with waiting: ${e}`)
    } 
    log("Done") 
} 


/*
   Function for scraping CMC using pupeteer.
 */ 
export async function scmc( page : any ) {

    //first scroll to load all the data
    await scroll_to_bottom_and_await_idle(page)

    //then get the data  
    let result = await page.evaluate( () => {

	let row_selector = "tbody > tr" ;
	
	var lib : any  = {
	    'rank'   : (x:any) => x.children[1].innerText  ,
	    'name'   : (x:any) => x.children[2].innerText.split("\n\n")[0] ,
	    'symbol' : (x:any) => x.children[2].innerText.split("\n\n")[1] ,
	    'price'  : (x:any) => Number(x.children[3].innerText.replace("$", "").replace(",","")), 
	    '1hr'    : (x:any) => {
		let negative = (x.children[4].querySelector("span > span").className == "icon-Caret-down") 
		return negative 
	    } 
	    
	} 

	let ks = Object.keys(lib); 
	let rows = Array.from(document.querySelectorAll(row_selector)) ;

	var tmp_result = [] ; 

	for (var r of rows) {
	    var data : any = {} 
	    for (var k of ks) {
		let fn = lib[k] ;
		var result = null ;
		try {
		    result = fn(r) 
		} catch (e : any) {
		    result = e 
		} 
		data[k] = result 
	    }
	    tmp_result.push(data) 
	} 
	
	return tmp_result 
	
    })

    return result 
} 




