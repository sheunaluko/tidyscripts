[**Tidyscripts Docs**](../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../globals.md) / [node](../../../README.md) / [cryptography](../README.md) / aes\_192\_encrypt\_message

# Function: aes\_192\_encrypt\_message()

> **aes\_192\_encrypt\_message**(`password`, `message`): `Promise`\<`object`\>

Performs in memory AES-192 encryption on a message given the supplied password. 
Generates a random initialization vector (iv) for the encryption, and returns 
both the cipher text and the iv.

## Parameters

• **password**: `string`

encryption password

• **message**: `string` \| `Buffer`

Message to encrypt, which is usually a String or a Buffer

## Returns

`Promise`\<`object`\>

### cipher

> **cipher**: `Buffer`

### iv

> **iv**: `Buffer`

## Defined in

[packages/ts\_node/src/cryptography.ts:59](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_node/src/cryptography.ts#L59)
