[**Tidyscripts Docs**](../../../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../../../globals.md) / [node](../../../../../README.md) / [apis](../../../README.md) / [radiopaedia](../README.md) / download\_case\_data

# Function: download\_case\_data()

> **download\_case\_data**(`id`): `Promise`\<`any`\>

Download all information about a radiopaedia case given its id
```
let case_data = await download_case_data('benign-intracranial-hypertension-5' } ) ; 
//Note that this function may take minutes to return, as it it was not optimized as of October 2022. 
```

## Parameters

• **id**: `string`

## Returns

`Promise`\<`any`\>

## Defined in

[packages/ts\_node/src/apis/radiopaedia.ts:326](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_node/src/apis/radiopaedia.ts#L326)
