[**Tidyscripts Docs**](../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../globals.md) / [node](../../../README.md) / [cryptography](../README.md) / aes\_192\_decrypt\_file

# Function: aes\_192\_decrypt\_file()

> **aes\_192\_decrypt\_file**(`password`, `filename`): `Promise`\<`Buffer`\>

Performs in memory AES-192 decryption of a file given the supplied password. 
Assumes that the first 16 bytes of the file are the plaintext initial vector (see aes_192_encrypt_file). 
Returns a decrypted buffer (which can then be converted to a string for text files)

## Parameters

• **password**: `string`

Password to use for decryption

• **filename**: `string`

File to decrypt

## Returns

`Promise`\<`Buffer`\>

## Defined in

[packages/ts\_node/src/cryptography.ts:153](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_node/src/cryptography.ts#L153)
