[**Tidyscripts Docs**](../../../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../../../globals.md) / [node](../../../../../README.md) / [apis](../../../README.md) / [pubmed](../README.md) / get\_article

# Function: get\_article()

> **get\_article**(`xml`, `num`): `any`

Returns article with index ```num``` from the xml objected returned from [parse_pubmed_baseline_file](parse_pubmed_baseline_file.md)
```
//for example 
let fp  = "./resources/pubmed22n0001.xml" ; 
let xml = parse_pubmed_baseline_file(fp)  ; 
let article1 = get_article(xml,0) ; 
```

## Parameters

• **xml**: `any`

• **num**: `number`

## Returns

`any`

## Defined in

[packages/ts\_node/src/apis/pubmed.ts:52](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_node/src/apis/pubmed.ts#L52)
