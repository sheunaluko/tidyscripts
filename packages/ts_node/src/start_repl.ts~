import * as repl from "repl" ; 
import * as node from './index';
import * as common from '../common/index';
import * as dev from "./repl_dev" ; 

declare var global : any ; 

global.node = node ;
global.common = common;
global.R  = common.R;
global.dev = dev ; 

const replServer = repl.start({
  prompt: '@> ',
});


