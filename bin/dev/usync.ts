import repl from "repl"
import node from "../../packages/ts_node/dist/index"

const {usync} = node.puppeteer.apis ;

const p = await usync.main()

declare var global : any ;

global.p = p ;
global.usync = usync ; 
global.node = node ;

const replServer = repl.start({ prompt: ':: ' }); 
