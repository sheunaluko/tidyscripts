/**
 * Testing for AI Medical Intelligence Engines (TAMIE) 
 *
 * Testing package for AMIE 
 *
 * @packageDocumentation
 */

import {logger} from "../../../index" ; 
import * as tests from "../test_data/index"  ; 
import * as engines from "../engines/index"

const log = logger.get_logger({'id':'tamie'}) ;

export function init() {log(`init`)}

export async function main() {
    init()  ;

    let t1 = tests.hp.esrd_hyperkalemia_losartan //load a test case

    // --  create a MedicationEngine
    let base_me_ops = { name : 'test-med' , model : 'gpt-4o-2024-05-13' } ;

    let me_4o_data = new engines.medications.MedicationEngine({
	model: 'gpt-4o' ,
	name : 'me-4o-data' ,
	supplementary_data : true 
    })

    let me_4o = new engines.medications.MedicationEngine({
	model: 'gpt-4o' ,
	name : 'me-4o' ,
	supplementary_data : false
    })
    
    //compute the result with and without

    let me_4o_data_result = await me_4o_data.evaluate(t1.hp) ; 
    let me_4o_result = await me_4o.evaluate(t1.hp)      ; 
    
    return {
	me_4o_data,
	me_4o,
	me_4o_data_result,
	me_4o_result 
    } 
    
    
}
