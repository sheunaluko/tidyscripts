import repl from  "repl"
import node from "../packages/ts_node/dist/index"
import common from "../packages/ts_common/dist/index" ;
import * as dev from "./dev/index" 

declare var global : any ;
const R = common.R ;
const get_logger = common.logger.get_logger ; 
const log = get_logger({id: 'repl'}) ; 
const debug = common.util.debug

let welcome_msg = ` 
Welcome to the Tidyscripts REPL (Read Eval Print Loop)
What exciting journey awaits you??
`


async function init_repl() { 

    if (!global.common) { global.common = common };
    if (!global.node  ) { global.node   = node   };
    if (!global.R     ) { global.R      = R      };
    if (!global.dev   ) { global.dev    = dev    };

    const surreal = dev.surreal ;
    const ghe     = node.generic_hierarchical_embedder ;
    const tobi     = common.tobi ;
    const tools  = dev.mcp_tools.TOOLS

    const test = async ()=> {
	let t = tools[1] ;
	return await t.handler({query : "how to recursive graph query"}) ; 
    }
    
    
    Object.assign(global, {
	debug ,
	surreal,
	ghe,
	tobi,
	test 
    })

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
    dev, 
} 
