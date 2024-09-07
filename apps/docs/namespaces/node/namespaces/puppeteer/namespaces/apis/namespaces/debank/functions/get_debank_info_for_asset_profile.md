[**Tidyscripts Docs**](../../../../../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../../../../../globals.md) / [node](../../../../../../../README.md) / [puppeteer](../../../../../README.md) / [apis](../../../README.md) / [debank](../README.md) / get\_debank\_info\_for\_asset\_profile

# Function: get\_debank\_info\_for\_asset\_profile()

> **get\_debank\_info\_for\_asset\_profile**(`f`): `Promise`\<`any`[][]\>

Gets the portfolio given the path to an asset profile .json file 
To use: 
```
 var ts = require("tidyscripts_node") ;
 var r = await ts.puppeteer.apis.debank.get_debank_info_for_asset_profile(process.env['ASSET_PROFILE_PATH'])  ; 

```

## Parameters

• **f**: `string`

## Returns

`Promise`\<`any`[][]\>

## Defined in

[packages/ts\_node/src/puppeteer/apis/debank.ts:63](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_node/src/puppeteer/apis/debank.ts#L63)
