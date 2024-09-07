[**Tidyscripts Docs**](../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../globals.md) / [node](../../../README.md) / [cryptography](../README.md) / aes\_192\_decrypt\_buffer

# Function: aes\_192\_decrypt\_buffer()

> **aes\_192\_decrypt\_buffer**(`password`, `cipher`, `iv`): `Promise`\<`Buffer`\>

Performs in memory AES-192 decryption on a buffer given the supplied password and initialization vector 
Returns the decrypted buffer.

## Parameters

• **password**: `string`

• **cipher**: `Buffer`

• **iv**: `Buffer`

## Returns

`Promise`\<`Buffer`\>

## Defined in

[packages/ts\_node/src/cryptography.ts:94](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_node/src/cryptography.ts#L94)
