
export type Indexer = string | number 

export enum Status {
    Ok = "OK", 
    Err = "ERR" , 
} 

export type None = null | undefined 

type ErrorObject = { [k:string] : any ,
		     description : string }

export interface Result<T>  { 
    status  : Status , 
    value? : T , 
    error? : ErrorObject ,
} 

export type AsyncResult<T> = Promise<Result<T>> 

export function Error(e : ErrorObject)  { 
    return { 
	status : Status.Err , 
	error : e 
    } 
} 

export function Success<T>(arg : T) { 
    return {  
	status : Status.Ok , 
	value : arg 
    } 
} 
