import repl from "repl"
import node from "../packages/ts_node/dist/index"

declare var global : any ;

var s = await node.bashr.startServer() ; 
