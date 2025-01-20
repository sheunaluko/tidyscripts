/**
 * Medications engine for AMIE 
 *
 * @packageDocumentation 
 */

import * as prompting from "../prompting/index" ; 
import {BaseEngine, BE_OPS} from "./base_engine" ; 
import * as debug from "../../../util/debug" ; 

const {
    patient_information_placeholder, 
    supplementary_information_placeholder, 
    extraction,  //extracts medications and provides supplementary information 
    evaluation,   //runs inference (contains the supp information placeholder)
    evaluation_without_supplementary_data, 
} = prompting.medications

interface ME_OPS extends BE_OPS {
    supplementary_data : boolean ,
    verbose? : boolean , 
} 


/*
   todo : implement TAMIE and create quick workflow that:
   - loads a test case 
   - evaluates the MedicationEngine on it 
   - uses AI call to provide PASS OR FAIL based on the engine output and the description of the test 
 */

export class MedicationEngine extends BaseEngine {

    supplementary_data : boolean ;
    verbose : boolean; 

    constructor(ops : ME_OPS  ) {
	let {supplementary_data,
	     verbose = true ,
	     ...base_ops} = ops ;
	
        super(ops as BE_OPS);

	this.supplementary_data = supplementary_data
	this.verbose = verbose ; 
    }

    /*
       Todo: emit events as 'status_update' events 
     */
    async extract_medication_information(info: string) {
	let prompt = extraction.prompt.replace(patient_information_placeholder, info)
	let response_format = extraction.rf
	let result = await this.structured_completion({prompt, response_format}) ;
	this.log(`Got extraction result`)
	debug.add(`extraction_result` , result)  ;
	if (this.verbose) { this.log(result) } 
	return result 
    }

    async build_prompt(info : string) {

	var prompt : string ;
	
	if (this.supplementary_data)  {
	    
	    this.log('running WITH supplementary data')
	    let supplementary_information = await this.extract_medication_information(info) ;
	    let tmp = evaluation.prompt.replace(patient_information_placeholder, info)
	    prompt = tmp.replace(supplementary_information_placeholder, JSON.stringify(supplementary_information) )
	    
	} else {
	    
	    this.log('running WITHOUT supplementary data')	    
	    prompt = evaluation_without_supplementary_data.prompt.replace(patient_information_placeholder, info)
	    
	}

	return prompt ; 
	
    }

    async evaluate(info : string) {
	let prompt = await this.build_prompt(info) ;
	let response_format = evaluation.rf ; 	 
	let result = await this.structured_completion({prompt, response_format}) ;
	this.log(`Got evaluation result`)
	debug.add(`evaluation_result` , result)  ;
	if (this.verbose) {
	    this.log(result)  
	}
	return result 
    }
    
} 

