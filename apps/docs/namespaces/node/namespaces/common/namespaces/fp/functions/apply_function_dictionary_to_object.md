[**Tidyscripts Docs**](../../../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../../../globals.md) / [node](../../../../../README.md) / [common](../../../README.md) / [fp](../README.md) / apply\_function\_dictionary\_to\_object

# Function: apply\_function\_dictionary\_to\_object()

> **apply\_function\_dictionary\_to\_object**(`fd`, `o`): `any`

Takes an object whos keys are fields in a dictionary and values are functions and calls each function with a supplied argument and assings the result to the corresping key of the return object

## Parameters

• **fd**: [`FunctionDictionary`](../interfaces/FunctionDictionary.md)

The "function dictionary" that maps keys to a transformer function

• **o**: `object`

## Returns

`any`

ret - An object whose keys index the corresponding result of the transformer function
```
let fd = { 'a' : ()=>"hi" , 'b' : (e)=>e.toLowerCase }
let res = apply_function_dictionary_to_object(fd, "HELLO")
//returns { 'a' : "hi" , 'b' : "hello" }
```

## Defined in

packages/ts\_common/dist/fp.d.ts:236
