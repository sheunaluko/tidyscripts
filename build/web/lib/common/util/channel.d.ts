declare type resolver = any;
declare type rejector = any;
declare type promiseEntry = [resolver, rejector];
export declare class Channel {
    value_que: any[];
    promise_que: promiseEntry[];
    constructor();
    read(): Promise<any>;
    write(data: any): void;
    flush(): void;
    log_data(): Promise<void>;
}
export {};
