import * as common from "../../common/index"
import * as node from "../../node/index" 

var { io } = node ;
var {R } = common ; 
import puppeteer from 'puppeteer' ;


const log = common.logger.get_logger({id: "puppeteer"}) ;

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




export { puppeteer }


	
