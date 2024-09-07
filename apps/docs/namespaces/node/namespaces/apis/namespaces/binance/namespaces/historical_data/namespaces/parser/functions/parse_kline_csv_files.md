[**Tidyscripts Docs**](../../../../../../../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../../../../../../../globals.md) / [node](../../../../../../../../../README.md) / [apis](../../../../../../../README.md) / [binance](../../../../../README.md) / [historical\_data](../../../README.md) / [parser](../README.md) / parse\_kline\_csv\_files

# Function: parse\_kline\_csv\_files()

> **parse\_kline\_csv\_files**(`dir`): `any`[]

Given a directory 'dir' that containes kline csv files, 
this function sorts and parses those csv files and returns 
a concatenated array of all the data, in the form of dictionary
objects (k,v pairs). The data can then ben analyzed or parsed.

## Parameters

• **dir**: `string`

## Returns

`any`[]

## Defined in

[packages/ts\_node/src/apis/binance/historical\_data/parser.ts:21](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_node/src/apis/binance/historical_data/parser.ts#L21)
