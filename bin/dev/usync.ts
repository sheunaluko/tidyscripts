import repl from "repl"
import node from "../../packages/ts_node/dist/index"

const {usync} = node.puppeteer.apis ;

const {p,to_be_synced} = await usync.main()

declare var global : any ;

global.p = p ;
global.usync = usync ; 
global.node = node ;
global.to_be_synced = to_be_synced ;

const replServer = repl.start({ prompt: ':: ' }); 
