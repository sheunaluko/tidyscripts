import node from "../../packages/ts_node/dist/index";
import common from "../../packages/ts_common/dist/index";

import {highlight_and_extract} from "./highlight_and_extract"
import {format_dom_summary_for_llm} from "./format_dom_summary_for_llm" 

/*

   Status: able to generate summary for the page (see format_dom_summary_for_llm)
   This contains the interactive elements and the full page text (innerText)

   Thoughts: was able to limit token usage drastically (from 120k to like 10k). However if the summary is maintained in the conversation
   then the token cost will go up and context length exhausted after just like 10 navigations.

   Thus: it appears the browser_agent must have a dynamically updating message_structure:

   [system] -> blah, blah [user] -> action history=((THIS_GETS_UPDATED_EACH_CALL)) , [user] -> current browser context=((THIS_IS_UPDATED_EACH_TIME)), [user] -> QUERY

   The LM returns an action, the action is performed, the action is appended to history, the new state/context is computed

   There should also be a goal , and isGoalAchieved? specified in the system message

   If goal is achieved then return. Else continue (and it has to track its plan, and progress on the plan).


   ----

   Alternatively, have to think about architecture for integrating this directly into cortex.
   - connect_to_playwright , go_to_url , get_page_interface , send_page_ui_event
   ----> the same problem here is that with looping through getting a page interface and sending ui event we will run out of context and build token usage up

   ----> SOLUTION?  "collapsible/expandable chats". Can mark a function_return_chat as "collapsible", so that after the value is used it is condensed to function_return_id=[ID]
   Interestingly, in many cases LLM can infer the function result based on its reponse after the result is given.

   Then include in the system message: Sometimmes you will see function_return_id=[ID],value="revealable" which indicates that you can reveal the value of the function call which is momentarily hidden. To do so you can use the tool:  reveal_function_return(id : number).  This will be registered like a regular function, however when called it will expand that return id (from a lookup table) and the re-rerun the LLM

   Need functions : (1) collapse function result (2) expand function result   [ in future could calculate embedding and use that as the id :) ] 
              


   ----

   
   Todo:
   - add url to the summary output (so it knows if after clicking it has gone to another page)
   - research dynamic management of system message and chat history (as well as LLM manipulating its own history/system message) 
   
   
   
 */


const log = common.logger.get_logger({id : "playr"}) ;
const debug = common.util.debug 

export async function init() {
    let b = await node.apis.playwright.get_ui_browser() ;
    let p = await b.newPage() ;
    await set_size(p, 1200, 1200) ;     
    return  p 
}


export async function native_browser() {
    var b = await node.apis.playwright.get_browser_with_ops({
	headless : false,
	executablePath: "/usr/bin/google-chrome-stable", 
    }) ;

    let p = await b.newPage() ;
    await set_size(p, 1200, 1200) ;     
    return  p 
    
}


export async function test(p : any ) {
    
    const els = await highlight_and_extract(p, 3000);
    const summary = format_dom_summary_for_llm(els)

    let result = {els, summary} 
    debug.add("result", result) ;
    return {result, p } 
}


export async function set_size(p : any, x:number,y:number) {
    await p.setViewportSize({ width: x || 1280, height: y || 720 });
}



export {highlight_and_extract, format_dom_summary_for_llm} ; 
