[**Tidyscripts Docs**](../../../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../../../globals.md) / [common](../../../../../README.md) / [apis](../../../README.md) / [aidx](../README.md) / clean\_json\_string

# Function: clean\_json\_string()

> **clean\_json\_string**(`jstring`): `string`

Cleans the response from the OpenAI API 
Assums the json starts with { or [ and attempts to trim the superfluous text 
before that, and also replaces newline and escape characters.

## Parameters

• **jstring**: `string`

## Returns

`string`

## Defined in

[packages/ts\_common/src/apis/aidx.ts:21](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_common/src/apis/aidx.ts#L21)
