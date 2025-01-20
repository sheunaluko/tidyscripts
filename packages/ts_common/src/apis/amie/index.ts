/**
 * AI Medical Intelligence Engines (AMIE)  
 * 
 * AMIE packages Medical AI Inference tasks into tidy units that can be run in node or in the browser. 
 * As they execute events are emitted to update state which can be optionally used for UI updates in the browser 
 * 
 * Because AMIE engines can be used in both browser and node, they allow for testing in node environments and depoloyment in web apps 
 * 
 * @packageDocumentation 
 */


import {logger} from "../../index"
import * as prompting from "./prompting/index"
import * as test_data from "./test_data/index"
import * as engines   from "./engines/index"
import * as tamie   from "./tamie/index"

const log = logger.get_logger({'id':'amie'}) ;


export function init() {log(`init`)}
export {
    prompting,
    test_data ,
    engines,
    tamie 
} 
