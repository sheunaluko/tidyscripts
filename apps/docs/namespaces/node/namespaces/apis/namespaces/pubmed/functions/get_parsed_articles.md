[**Tidyscripts Docs**](../../../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../../../globals.md) / [node](../../../../../README.md) / [apis](../../../README.md) / [pubmed](../README.md) / get\_parsed\_articles

# Function: get\_parsed\_articles()

> **get\_parsed\_articles**(`fpath`, `xml`): `any`

Reads the xml baseline file and parses all of its articles, returning a large array.
Note, you may need to increase the RAM allocated to the node process in order to parse the entire xml file without streaming.
If you get a memory error, try increasing RAM by running ```export NODE_OPTIONS=--max_old_space_size=4096``` before launching the node process.
Below is example usage. 
```
//for example 
let articles = get_parsed_articles("./path/to/pubmed22n0001.xml") ; 
let {pmid, title, date, authors, mesh_headings} =  articles[0] ; 
console.log(articles[29400]) ;
// outputs the following -> 
{
pmid: '30361',
title: '[Antipsychotic neuroplegic and neuroleptic agents. I - definition and classification].',
date: { year: '1978', month: '12', day: '20' },
authors: [
  { lastname: 'Deligné', forename: 'P', initials: 'P' },
  { lastname: 'Bunodi ère', forename: 'M', initials: 'M' }
],
mesh_headings: [
  {
    ui: 'D014150',
    majortopic: 'N',
    qualifiers: [Array],
    descriptor_name: 'Antipsychotic Agents'
  }, .... 
]
}
```

## Parameters

• **fpath**: `string`

• **xml**: `any`

## Returns

`any`

## Defined in

[packages/ts\_node/src/apis/pubmed.ts:211](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_node/src/apis/pubmed.ts#L211)
