/**
 * Main script to start the FHIR server
 */

import node from "../../packages/ts_node/dist/index";
import common from "../../packages/ts_common/dist/index";

const log = common.logger.get_logger({id : "fhir"}) ;
const g_loinc = common.apis.data_generator.generate_loinc ; 

declare var global : any ;	     


log(`Init fhir`)


const { FHIRServer } = node.fhir_server ;


export async function start_server(data_file : string , port : any ) {

    // Load the patient data from the data_file 
    log(`Loading patient data from file: ${data_file}`) 
    const data = node.io.read_json(data_file) 

    // Create and start the FHIR server
    const _port = port || 8001;    
    log(`Starting fhir server on port: ${_port}`)     
    const server = new FHIRServer(data);
    server.start(_port);

    
}



export async function generate_data(info : string) {
    return await common.apis.data_generator.get_fhir_data(info)
}


export async function test_1() {
    let info = "set of all loinc codes that reflect white blood cell count of blood"
    return await g_loinc(info) ; 
}

export async function test_2() {
    let info = "64 female patient with RNYGB and cholangitis"
    return await generate_data(info) ; 
}
