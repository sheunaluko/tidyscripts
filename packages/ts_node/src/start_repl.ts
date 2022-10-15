import * as repl from "repl" ; 
import * as node from './index';


declare var global : any ; 

global.node = node ;

const replServer = repl.start({
  prompt: '@> ',
});


