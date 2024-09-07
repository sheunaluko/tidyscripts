[**Tidyscripts Docs**](../../../../../../../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../../../../../../../globals.md) / [node](../../../../../../../../../README.md) / [apis](../../../../../../../README.md) / [binance](../../../../../README.md) / [historical\_data](../../../README.md) / [downloader](../README.md) / handle\_link\_object

# Function: handle\_link\_object()

> **handle\_link\_object**(`dir`, `lo`): `Promise`\<`void`\>

Main function for downloading a link object. 
Link object consists of {checksum_link, zip_link} 
It will download the data to subdirectory of 'dir'

## Parameters

• **dir**: `string`

• **lo**: `any`

## Returns

`Promise`\<`void`\>

## Defined in

[packages/ts\_node/src/apis/binance/historical\_data/downloader.ts:31](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_node/src/apis/binance/historical_data/downloader.ts#L31)
