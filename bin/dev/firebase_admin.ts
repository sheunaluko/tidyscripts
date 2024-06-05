import node from "../../packages/ts_node/dist/index";
import common from "../../packages/ts_common/dist/index";

const fa = node.apis.firebase_admin   
const log = common.logger.get_logger({id: "dev:fba"})

export function init() {
    let loc  = process.env['TIDYSCRIPTS_FIREBASE_KEY_LOC']
    log(`Loading keyfile from location: ${loc}`)
    //log(`Using file: ${loc}`) ;
    // @ts-ignore 
    return fa.init_from_keyfile(loc) ;

} 




