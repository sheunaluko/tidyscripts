import node from "../../packages/ts_node/dist/index";
import common from "../../packages/ts_common/dist/index";


const log = common.logger.get_logger({id : "bots_dev"}) ;

declare var global : any ; 

const functions = [
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

    {
	"description" : "Performs the special transformation" ,
	"name" : "transform" ,
	"args" : "input : string", 
	"return_type" : "string" ,
	"fn" :  async function( args : {input : string} ) {
	    
	    log(`Request to transform ${args.input}`)
	    return "TRANSFORMED!" 
	}
    }, 
    
    

    
] ; 

log("Creating chat bot")
export var bot = node.apis.bots.get_chat_bot(functions)

global.chat = bot.chat 

/*
   Ideas:
   - figure out better architecture for improving when and how the bot decides to use the tools
   - that are available (

   Todo:
   - implement the ability for the bot to run the function requested by the bot_brain and to 
   - provide back the resultant information to the bot_brain  
   

 */ 
