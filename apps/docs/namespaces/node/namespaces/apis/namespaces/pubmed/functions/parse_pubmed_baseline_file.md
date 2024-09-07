[**Tidyscripts Docs**](../../../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../../../globals.md) / [node](../../../../../README.md) / [apis](../../../README.md) / [pubmed](../README.md) / parse\_pubmed\_baseline\_file

# Function: parse\_pubmed\_baseline\_file()

> **parse\_pubmed\_baseline\_file**(`bf`): `Document`

Parses a pubmed baseline file

## Parameters

• **bf**: `string`

the path to the bf stored on disk 
```
//for example 
let fp  = "./resources/pubmed22n0001.xml" ; 
let xml = parse_pubmed_baseline_file(fp)  ; 
```

## Returns

`Document`

## Defined in

[packages/ts\_node/src/apis/pubmed.ts:39](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_node/src/apis/pubmed.ts#L39)
