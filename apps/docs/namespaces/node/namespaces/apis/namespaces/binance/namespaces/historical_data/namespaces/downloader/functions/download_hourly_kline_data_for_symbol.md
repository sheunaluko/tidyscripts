[**Tidyscripts Docs**](../../../../../../../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../../../../../../../globals.md) / [node](../../../../../../../../../README.md) / [apis](../../../../../../../README.md) / [binance](../../../../../README.md) / [historical\_data](../../../README.md) / [downloader](../README.md) / download\_hourly\_kline\_data\_for\_symbol

# Function: download\_hourly\_kline\_data\_for\_symbol()

> **download\_hourly\_kline\_data\_for\_symbol**(`dir`, `symbol`): `Promise`\<`void`\>

Main entry point for downloading historical data. 
Just enter the top level directory to download data to and the symbol you want to download 
and this will download the hourly kline data for that symbol. 
This includes downloading zip files, checking the checksums, and extracting the csvs. 
The data will be in a nested location within the suppplied top level directory. 
For example, in the node command line just run this... 
```
let _ = await ts.apis.binance.historical_data.downloader.download_hourly_kline_data_for_symbol("/path/to/data/crypto/historical", "ETHBTC")
```

## Parameters

• **dir**: `string`

• **symbol**: `string`

## Returns

`Promise`\<`void`\>

## Defined in

[packages/ts\_node/src/apis/binance/historical\_data/downloader.ts:114](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_node/src/apis/binance/historical_data/downloader.ts#L114)
