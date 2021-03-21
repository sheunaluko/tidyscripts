import * as fp from "./fp.ts" 
import type  {
    IOProcess , 
    IOArgs, 
    IOPacket,
    IOData, 
    IODataPacket, 
}  from "./stdio.ts" 

import { 
    IOPacketType,
    IOChannel , 
} from "./stdio.ts" 



type PacketTransformer = (p : IODataPacket) => IOPacket
type DataTransformer = (d : IOData) => IOData 


export var debug = false ; 
export function set_debug(b : boolean) {  debug = b  }  

export var log = function(m : any ) { 
    if (debug) { 
	console.log(m) 
    } 
} 

function PT2IOProcess(packet_transformer : PacketTransformer) : IOProcess { 
    
    return async function(args : IOArgs)  {
	
	log("Running IO process... with args: ") 
	log(args) 
	
	while (true) { 
	    let packet : IOPacket = await args.stdin.read() 
	    //check if we have reached EOF 
	    log("process got packet")
	    log(packet) 
	    if (packet.type == IOPacketType.EOF ) {
		args.stdout.write(packet)
		break 
	    } else { 
		//apply the packet transformer 
		let new_packet = packet_transformer(packet as IODataPacket)
		args.stdout.write(new_packet)
		log("transformed packet")
		log("old")
		log(packet) 
		log("new")
		log(new_packet) 
	    }
	}
	
    }
    
}

function DT2IOProcess(data_transformer : DataTransformer) : IOProcess  { 
    let packet_transformer = function(p : IODataPacket) {
	log("Data transformer: ")
	log(p) 
	return { 
	    ...p , 
	    data : data_transformer(p.data)
	} 
    } 
    return PT2IOProcess(packet_transformer) 
} 
    


export var split = (sep : string) => DT2IOProcess( (data : IOData) => data.split(sep) ) 
export var index = (num : number) => DT2IOProcess( (data : IOData) => data[num] ) 
export var to_number = () => DT2IOProcess( (data : IOData) => Number(data) ) 
export var inc = (num : number) => DT2IOProcess( (data : IOData) => data + num ) 

export function logger_stdout(tag :string) : IOChannel {
    let ch = (new IOChannel() )  ; 
    
    (async function() { 
	while (true) {
	    let p = await ch.read() 
	    if (p.type == IOPacketType.EOF) {
		console.log("EOF > done!") 
		break 
	    } else { 
		p = (p as IODataPacket) //will fix later
		console.log(`[${tag}]:: ${p.data}`)
	    } 
	} 
    })()
    return ch 
}

    

export function string_producer(text : string, sep : string)  : IOProcess { 
    let tokens = text.split(sep) 
    //log(tokens)
    return async function( args : IOArgs ) { 
	//write tokens to stdout 
	//log(tokens) 
	tokens.map( (t: string) => {
	    //log(t)
	    let packet = { 
		type : IOPacketType.Data , 
		data : t , 
	    } 
	    args.stdout.write(packet as IOPacket)  
	    log("string wrote" )
	    log(packet) 
	})
	//then write EOF  
	args.stdout.write({ type : IOPacketType.EOF }) 
    } 
} 
