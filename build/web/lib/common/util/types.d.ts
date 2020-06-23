export declare type Indexer = string | number;
export declare enum Status {
    Ok = "OK",
    Err = "ERR"
}
export declare type None = null | undefined;
declare type ErrorObject = {
    [k: string]: any;
    description: string;
};
export interface Result<T> {
    status: Status;
    value?: T;
    error?: ErrorObject;
}
export declare type AsyncResult<T> = Promise<Result<T>>;
export declare function Error(e: ErrorObject): {
    status: Status;
    error: ErrorObject;
};
export declare function Success<T>(arg: T): {
    status: Status;
    value: T;
};
export {};
