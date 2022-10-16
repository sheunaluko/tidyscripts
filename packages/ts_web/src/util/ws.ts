import * as common from "tidyscripts_common"

let log = common.logger.get_logger({id: "ws" }) 

export interface WsOps { 
    url : string, 
    handler : (e:any) => void , 
    error? : (e:any) => void, 
    close? : () => void, 
    open? : () => void, 
} 


export function WebSocketMaker(ops : WsOps) { 
    
    var {url,handler,open, error,close} = ops    
    
    /*  get params ready     */
    open = open   || ( ()=> {log(`ws to ${url} opened`)}  )
    close = close || ( ()=> {log(`ws to ${url} closed`)} )
    error = error || ( (e:any)=> {log(`ws to ${url} errored: ${JSON.stringify(e)}`)} )
    
    /* go .. */ 
    let ws = new WebSocket(url) 
    ws.onopen = open 
    ws.onclose = close 
    ws.onerror = error 
    ws.onmessage = (e:any) => {handler(e.data)} 
    
    return ws 
} 
