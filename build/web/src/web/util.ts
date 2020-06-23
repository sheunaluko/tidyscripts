


import * as common from "../common/util/index" ; //common utilities  

export {common } 


import {Success,
	Error, 
	AsyncResult} from "../common/util/types" 

let log = common.Logger("wutil") 
    

export function alert(s : string) { 
    log("Alerting web page!") 
    window.alert(s) 
} 



