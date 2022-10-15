

/* 
   
 Thu Dec 31 10:40:21 CST 2020
 @copyright Sheun Aluko 
 
 Allows tidyscripts libraries to import this class and insantiate an external logger object. 
 Then they can call the log function to "export" logs to some third party application which is hosting 
 tidyscripts. 
 
 It is the external apps responsibility to call set_logger in order to bind the appropriate log pathways 
 
 In the future I will probably upgrade this interface, but keeping it simple for now (Thu Dec 31 10:52:37 CST 2020) 
*/ 

import * as common from "../../common/util/index" ; //common utilities  
let log = common.Logger("ext_log")

export class ExternalLogger { 
    
    logger : any = null 
    name : string = "" 
    
    
    constructor(name : string) {
	this.name = name  
	log("Created external logger for " + name ) 
    } 
    
    set_logger(f : any) {
	this.logger = f ; 
	log("reset ext logger for " + this.name)
    } 
    
    log(...args : any){ 
	if (this.logger) { 
	    this.logger.apply(null, args) 
	} else { 
	    log("No event logger for "  + this.name) 
	} 

    } 
} 
