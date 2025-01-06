import repl from "repl"
import node from "../../packages/ts_node/dist/index"

const {uload} = node.puppeteer.apis ;

declare var global : any ;

global.uload = uload ; 
global.node = node ;

await uload.init() 
//const replServer = repl.start({ prompt: ':: ' }); 
