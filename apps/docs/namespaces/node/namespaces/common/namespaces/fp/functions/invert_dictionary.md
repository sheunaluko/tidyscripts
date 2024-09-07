[**Tidyscripts Docs**](../../../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../../../globals.md) / [node](../../../../../README.md) / [common](../../../README.md) / [fp](../README.md) / invert\_dictionary

# Function: invert\_dictionary()

> **invert\_dictionary**(`dic`, `current_path`?): `any`

Inverts a dictionary; in other words will return an array of objects where the value key is a
"leaf" value in the dictionary and the associated "path" key is an array of strings that are
the keys that lead to that value in the nested dictionary.
```
const dic = {
   a : 1,
   b : {  c : 2 } ,
   d : { e : { f: 3 } ,
	    y1 : { x1 : 20 ,
	           x2 : 30,
		   x3 : { b : 40 }  } } ,
}

invert_dictionary(dic)  // =>
[
 { value: 1, path: [ 'a' ] },
 { value: 2, path: [ 'b', 'c' ] },
 { value: 3, path: [ 'd', 'e', 'f' ] },
 { value: 20, path: [ 'd', 'y1', 'x1' ] },
 { value: 30, path: [ 'd', 'y1', 'x2' ] },
 { value: 40, path: [ 'd', 'y1', 'x3', 'b' ] }
]
```

## Parameters

• **dic**: `any`

• **current\_path?**: `string`[]

## Returns

`any`

## Defined in

packages/ts\_common/dist/fp.d.ts:63
