import node from "../../packages/ts_node/dist/index";
import common from "../../packages/ts_common/dist/index";

const log = common.logger.get_logger({id : "pup_dev"}) ;

declare var global : any ;



log(`Init pup setup`)

const P = node.puppeteer ;

await P.get_browser({})
const p1 = await P.new_page({})

let url = "https://coinmarketcap.com"
log(`Navigating to ${url}`)

await P.go_and_wait(p1, url)


Object.assign(global, {
    P, p1   
})


