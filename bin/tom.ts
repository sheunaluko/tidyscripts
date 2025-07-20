import node from "../packages/ts_node/dist/index"
import common from "../packages/ts_common/dist/index" ;

const get_logger = common.logger.get_logger ; 
const log = get_logger({id: 'TOM'}) ; 

let welcome_msg = ` 
Hi Shay - Just Keep Going \(^.^)/
Launching TOM 
`

console.log(welcome_msg) ; 
