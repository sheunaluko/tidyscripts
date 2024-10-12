/**
 * Main script to start the FHIR server
 */

import node from "../../packages/ts_node/dist/index";
import common from "../../packages/ts_common/dist/index";

const log = common.logger.get_logger({id : "fhir"}) ;

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


