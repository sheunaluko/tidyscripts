

import {
  assertEquals,
  assertArrayContains,
} from "https://deno.land/std/testing/asserts.ts";

import {Logger } from "./logger.ts"

export {Logger} 


export {assertEquals,assertArrayContains}



export function repeat<T>(thing : T, num : number) : T[]{
    return Array(num).fill(thing) 
} 
