import node from "../../packages/ts_node/dist/index";
import common from "../../packages/ts_common/dist/index";


const log = common.logger.get_logger({id : "bots_dev"}) ;

declare var global : any ;

var PAGE_REF : any = null ;
var PAGE_REF_NAME = "PAGE_REF" ;

// --

const functions = [

    {
	"description" : "Opens a puppeteer page. This can be used to search the internet and extract information." 
	"name" : "open_browser_page" ,
	"args" : "", 
	"return_type" : "any" ,
	"fn" :  async function() {
	    
	    log(`Request to to open puppeteer page`)
	    global[PAGE_REF_NAME] = await node.puppeteer.new_page({}) ; 
	    log(`Completed. `) 
	    return `${PAGE_REF_NAME} now is a reference to the opened browser page`
	}
	
    },

    {
	"description" : "Navigates the open page to a url. There MUST be an open page before this can be run" ,
	"name" : "goto_url" ,
	"args" : "url : string", 
	"return_type" : "boolean" ,
	"fn" :  async function(args : {url : string} ) {
	    
	    log(`Request to go to URL `)
	    await (global[PAGE_REF_NAME]).goto(args.url) ; 
	    log(`Completed. `) 
	    return true 
	}

	
    }, 
    
    
    

    
] ; 

log("Creating chat bot")
export var bot = node.apis.bots.get_chat_bot(functions)

global.chat = bot.chat 

/*
   Ideas:
   - figure out better architecture for improving when and how the bot decides to use the tools
   - that are available 

   - in the future enable the bot to manage long running and parallel tasks? 
   - 

   VIDEO 
     - I was surprised to find that he bot could chain several functions together 
     - to accomplish multi step problems (i.e retriveve X and transform it then save it to disk) 

   Todo:
   - How can the bot have a scratchpad of informaion to work with?
   - this is how (one way) => 
   - Upgrade the brain protocol to ALWAYS receive and return JSON 
     - include in the JSON a a metadata or context field which contains information 
     - that can be used by the bot 
   - downside=> the main downside of this is that the context information is passed back and forth 
     - and will use up tokens.  
     - solution? If instead the context was stored in the system message and this could be updated 
       - that would likely be more efficient -> ACTUALLY the AI would have to output CHANGES to 
         - context which would have to be sent to to update the SYSTEM_MSG  
     = so maybe this upgrade is actually the way to go :) 
   

 */ 



export var other_functions = [ 
        {
	"description" : "This function retrieves the most relevant and up-to-date information about the search_string from the internet" ,
	"name" : "search_internet" ,
	"args" : "search_string : string" ,
	"return_type" : "string" ,
	"fn" :  async function( args : {search_string : string} ) {
	    
	    /*
	       this is where the search is performed!
	       can swap out the desired search functionality as needed
	     */
	    
	    log(`Request for search for ${JSON.stringify(args.search_string)}`)
	    log("Will give back 100")
	    return "The result is 100" 
	}
    },

    {
	"description" : "Writes a text file to disk given a file path and file contents. Returns true if the write was sucessful and false if it failed." ,
	"name" : "write_file" ,
	"args" : "path : string , content : string" ,
	"return_type" : "boolean" ,
	"fn" :  async function( args : {path : string , content : string} ) {
	    
	    log(`Request to write file ${args.path} to disk`)
	    log(`Writing content: ${args.content}`)
	    
	    return true 
	}
    },
]
