/* 
   
   Unix style pipe processing in typescript for use in deno and web 
   Sat 20 Mar 2021 14:30:04 PDT
   @Copyright Sheun Aluko
   
 */
import {IOChannel} from "./stdio_channel" 

/* ---  */
enum IOPacketType { 
    Data,
    Error, 
    EOF, 
} 
/* ---  */
interface IOErrorPacket { 
    type : IOPacketType.Error , 
    msg : string, 
    metadata : any , 
} 
/* ---  */
type IOData = any //for now -- may upgrade 
/* ---  */
type IOMetadata = any //for now -- may upgrade 
/* ---  */
interface IOEOFPacket { 
    type : IOPacketType.EOF 
} 
/* ---  */
interface IODataPacket { 
    type      : IOPacketType.Data, 
    data      : IOData, 
    metadata? : IOMetadata, 
} 
/* ---  */    
type IOPacket = (IOEOFPacket | IODataPacket | IOErrorPacket) 
/* ---  */
interface IOArgs { 
    stdin :  IOChannel  , 
    stdout : IOChannel   ,  
    stderr :  IOChannel  , 
    extra? : any , 
    
} 
/* -- */ 
type IOProcess = (args :  IOArgs) => Promise<void> ;  
/* -- */ 
type IOPipeline = IOProcess[]; 
/* -- */ 
type IOProcessArgTuple = [IOProcess,IOArgs] 
/* -- */ 
type IORunningPipeline = IOProcessArgTuple[] 


/* 
   This implements a simple pipeline of IOProcesses and allows messages to flow through them
   
   Another variation that would be interesting is being able to swap out or update an IOProcess in 
   the middle of execution. To achieve this, instead of directly wiring the IOProcess stdin and 
   stdout to eachother, you would allow each IOP (IOProcess) to have its own independent ones
   Then there would be a Router object which specified the routing map, for example 
   
   while (true) { data = await ch1.stdout.read() ; GET_CH_1_ROUTE().write(data)  }
   NOrmally GET_CH_1_ROUTE() would return ch2.stdin , but if ch2 has been replaced 
   then the NEW input channel will be returned 
   
   Can generate a UUID for each process and autopopulate a shared Mapping 
   { uuid : IOChannel } . Then updates can be done by mutating the mapping and 
   GET_CH_*UUID*_ROUTE = (uuid) => MAPPING[uuid] 

 */
function RunIOPipeline(iop : IOPipeline, globalIO : IOArgs ) : IORunningPipeline {  
    
    let {stdin, stdout, stderr} = globalIO; 
    
    let running_pipeline : IORunningPipeline = [] 
    
    let initialArgs = { 
	stdin , 
	stdout : (new IOChannel() )   , 
	stderr , 
    } 
    
    let lastArgs  = iop.reduce( function(args : IOArgs, p : IOProcess) {
	// -- 
	p(args) //will start the process 
	
	//add to the running pipeline 
	running_pipeline.push([p , args])
	
	//and return the next args 
	return {
	    stdin : args.stdout , 
	    stdout : (new IOChannel()) , 
	    stderr ,
	} 
	
    }, initialArgs )
    
    //finally we connect the returned stdout to the global stdout 
    lastArgs.stdin.connect(stdout) 
    
    //and return the running pipeline 
    return running_pipeline 
    
} 

var EOF  =  {
	type : IOPacketType.EOF 
} 

    
    
export type { 
    IOErrorPacket, IOData, 
    IOMetadata, IOEOFPacket, IODataPacket, 
    IOPacket, IOArgs, IOProcess, 
    IOPipeline, IOProcessArgTuple, IORunningPipeline, 

} 

export { 
    IOPacketType, RunIOPipeline , IOChannel,  EOF 
} 
