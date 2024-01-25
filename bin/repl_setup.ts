
import repl from  "repl"
import node from "../packages/ts_node/dist/index"
import common from "../packages/ts_common/dist/index" ;
import * as local from "./local/index" 


declare var global : any ;
const R = common.R ;
const get_logger = common.logger.get_logger ; 
const log = get_logger({id: 'repl'}) ; 


let welcome_msg = ` 
Welcome to the Tidyscripts REPL (Read Eval Print Loop)
What exciting journey awaits you?
`

async function init_repl() { 

    if (!global.common) { global.common = common };
    if (!global.node  ) { global.node   = node   };
    if (!global.R     ) { global.R      = R      };
    if (!global.local ) { global.local  = local  };     

    log(welcome_msg)
    
    const replServer = repl.start({
	prompt: ':: ',
    });

}

export {
    node,
    common,
    get_logger , 
    R,
    init_repl ,
    local, 
} 
