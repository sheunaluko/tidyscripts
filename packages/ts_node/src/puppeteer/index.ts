
import puppeteer from 'puppeteer' ;
import tidyscripts_common from 'tidyscripts_common'  ;
import * as apis from "./apis/index"


const log = console.log // tidyscripts_common.logger.get_logger({id: "puppeteer"}) ;

var started = false;
var browser : any  = null 

export async function get_browser(ops : any) : Promise<any> {

    if (browser) { return browser } else {

	log("Starting puppeteer...") 
	browser = await puppeteer.launch(
	    Object.assign({
		headless: false,
		defaultViewport : null, 
		slowMo: 5
	    },ops)
	);

	log("Created browser")

	return browser ; 
    }

}

export async function new_page(ops :any) {
    let browser = await get_browser(ops)
    let page = await browser.newPage()
    return page ; 
}




export { puppeteer, apis }


	
