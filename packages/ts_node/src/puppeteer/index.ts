/**
 * API for automated browser scripting using puppeteer. 
 * 
 * ```
 * await node.puppeteer.get_browser() 
 * await p1 = node.puppeteer.new_page()
 * await p2 = node.puppeteer.new_page()
 * 
 * await p1.goto("https://tidyscripts.com") 
 * let scraped_data = await p1.evaluate( ... )  
 * ```
 * 
 * @packageDocumentation
 */

import puppeteer from 'puppeteer' ;
import * as common from 'tidyscripts_common'  ;
import * as apis from "./apis/index"
import * as speech from "./speech"
import * as oai from "../apis/openai/index"
import * as gem from "../apis/gemini/index" 

const log = common.logger.get_logger({id: "pup"}) ;

var started = false;
var browser : any  = null 


export async function remote_connect(port : number ) {

    let url = `http://localhost:${port}/json/version` ; 
    log(`Getting info from url=${url}...`)
    const res = await fetch(url);
    const { webSocketDebuggerUrl } = await res.json();

    let wsurl = webSocketDebuggerUrl ;
    log(`Got debuggerURL = ${wsurl}`) ; 

    log(`Connecting`) 
    let browser = await puppeteer.connect({
	browserWSEndpoint: wsurl,
    });

    log(`Creating page`)     
    let page = await browser.newPage();
    await page.goto('https://tidyscripts.com');

    log(`Setting view port`) 

    await matchViewportToBrowserWindow(page) ;
    
    log(`Done`)

    return {
	browser, page 
    }

}

async function matchViewportToBrowserWindow(page : any) {
  // Get the actual browser window's inner dimensions
  const windowSize = await page.evaluate(() => {
    return {
      width: window.outerWidth,
      height: window.outerHeight
    };
  });
  
  // Set viewport to match the browser window
  await page.setViewport({
    width: windowSize.width,
    height: windowSize.height
  });
  
  return windowSize; 
}


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


export async function go_and_wait(page : any , url : string) {
    await page.goto(url, { waitUntil : 'networkidle2'}) 
} 


export async function executeCode(page : any, generatedCode : any) {
    try {
        const scrapedData = await page.evaluate(new Function(generatedCode));
        console.log('Scraped Data:', scrapedData);
        return scrapedData;
    } catch (error) {
        console.error('Error executing scraping code:', error);
        return null;
    }
}


/**
 * Makes an llm call to analyze the content of a puppeteer page and produce 
 * an output based on the page content 
 * 
 * @param page   The puppeteer page 
 * @param prompt The instructions to the llm for what to output (the task) 
 *
 */
export async function get_ai_scraping_code(page : any , prompt : string) {

    let page_content = await page.content(); 
    
    let query = `

       Hey there! I'd like help with something. 
       Here is an html page that I am trying to scrape: 

       -- begin page content -- 
       ${page_content} 
       -- end page content --  

       Now, id like you to follow this prompt: 

       -- begin prompt -- 
       ${prompt} 
       -- end page prompt --  

    `;

    let result = await llm.ask_gemini(query) ;
    return result 
} 


const interaction_summary_prompt  = ` 
 You are an expert at parsing and interpreting html content. You ingest html content and understand the structure of the html page. You are a web scraping expert and can accurately identify the structural outline of the page and likely targets of interaction. You find elements on the page that the user can click on and you summarize these elements in a structured json object. The keys of the json object are hyphenized 2-3 word descriptions such as "expand-all-button" and the value of the corresponding object is a string (we will refer to it as 'selector') which is passed to a function shown next in order to interact with the puppeteer page (make sure that selector is in the correct format for correct execution of the clickSelector function): 

async function clickSelector(page : any, selector : string) {
    await page.evaluate( ()=> document.querySelector(selector).click()  ) ; 
} 


`

async function clickSelector(page : any, selector : string) {

    await page.evaluate( ()=> (document.querySelector(selector) as any).click()  ) ; 
} 


/**
 * Produces a json object which summarizes the interactable items on a page and provides  
 * functions for interacting with them 
 * 
 * @param page The puppeteer page 
 */
export async function summarize_page_interactions(page : any) {
    log(`Summarizing page interactions`) 
    let r = await get_ai_scraping_code(page, interaction_summary_prompt) ;
    log(`Received code result: ${r}. Will run this code..`)
    let re = await executeCode(page,r) 
    log(`Received execution result: ${re}`)
    return re 
} 

export { puppeteer, apis, speech }



var llm : any  =  {

    ask_gpt : async function(prompt : string) {
	/* See node.apis.openai */
	let messages = [{"role": "user", "content": prompt }]
	return await oai.chat_completion(messages, "gpt-4o" , 3000) ; 
    }  ,

    ask_gemini : async function(prompt : string) {
	/* See node.apis.gemini.chat */
	return await gem.chat.completion(prompt) ; 
    }
    
    
} 
