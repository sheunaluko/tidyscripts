[**Tidyscripts Docs**](../../../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../../../globals.md) / [node](../../../../../README.md) / [common](../../../README.md) / [fp](../README.md) / concat\_accross\_index

# Function: concat\_accross\_index()

> **concat\_accross\_index**(`arrs`): `any`[][]

Takes an array of X arrays with Y values each, and produces an array of Y arrays with
 X values each. The first array is the concatenation of the first elemenent of each subarray.
The second returned array is the concatenation of the second element of each subarray.
And so forth.

```
//create a dictionary from separate key/value arrays
let keys = ['a', 'b', 'c'] ; let values = ['v1', 'v2' ,'v3]
let pairs = concat_accross_index( [keys,values]  )
//  > [ ['a', 'v1'] , ['b', 'v2'] ... ]
let dic  = Object.fromEntries( pairs )
```

## Parameters

• **arrs**: `any`[]

## Returns

`any`[][]

## Defined in

packages/ts\_common/dist/fp.d.ts:140
