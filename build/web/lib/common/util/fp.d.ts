declare type dic = {
    [k: string]: any;
};
export declare function keys(a: dic): string[];
export declare function values(a: dic): any[];
export declare function get(o: dic, a: string): any;
export declare function clone(o: dic): dic;
export declare function set(o: dic, a: string, val: any): dic;
export declare function set_im(o: dic, a: string, val: any): dic;
export declare function getter(a: string): (o: dic) => any;
export declare function setter(a: string, val: any): (o: dic) => dic;
export declare function setter_im(a: string, val: any): (o: dic) => dic;
export declare function all_true(arr: boolean[]): boolean;
export declare function repeat<T>(thing: T, num: number): string[];
export declare function map<I, O>(arr: I[], mapper: (x: I) => O): O[];
export declare function inc(n: number): (x: number) => number;
export {};
