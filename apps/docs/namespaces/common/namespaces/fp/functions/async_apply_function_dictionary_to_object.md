[**Tidyscripts Docs**](../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../globals.md) / [common](../../../README.md) / [fp](../README.md) / async\_apply\_function\_dictionary\_to\_object

# Function: async\_apply\_function\_dictionary\_to\_object()

> **async\_apply\_function\_dictionary\_to\_object**(`fd`, `o`): `Promise`\<`any`\>

Same as apply_function_dictionary_to_object however assumes asynchronous transformer functions. Takes an object whos keys are fields in a dictionary and values are functions and calls each function with a supplied argument and assings the result to the corresping key of the return object

## Parameters

• **fd**: [`FunctionDictionary`](../interfaces/FunctionDictionary.md)

The "function dictionary" that maps keys to a transformer function

• **o**: `object`

## Returns

`Promise`\<`any`\>

ret - An object whose keys index the corresponding result of the transformer function
```
let fd = { 'a' : ()=>"hi" , 'b' : (e)=>e.toLowerCase } 
let res = apply_function_dictionary_to_object(fd, "HELLO") 
//returns { 'a' : "hi" , 'b' : "hello" } 
```

## Defined in

[packages/ts\_common/src/fp.ts:741](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_common/src/fp.ts#L741)
