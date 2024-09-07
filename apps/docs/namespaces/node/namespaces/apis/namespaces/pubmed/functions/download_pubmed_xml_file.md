[**Tidyscripts Docs**](../../../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../../../globals.md) / [node](../../../../../README.md) / [apis](../../../README.md) / [pubmed](../README.md) / download\_pubmed\_xml\_file

# Function: download\_pubmed\_xml\_file()

> **download\_pubmed\_xml\_file**(`num`, `dir`): `Promise`\<`void`\>

Downloads a pubmed xml file given the file numbe and optional directory 
to save the file too. If dir is unset then the `default_data_dir` is used 
which can be set by calling `set_default_data_dir` 

Note: this executes a shell command and assumes that "curl" is available
If it is not, the command will fail.

## Parameters

• **num**: `number`

• **dir**: `string`

## Returns

`Promise`\<`void`\>

## Defined in

[packages/ts\_node/src/apis/pubmed.ts:272](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_node/src/apis/pubmed.ts#L272)
