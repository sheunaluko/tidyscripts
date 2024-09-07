[**Tidyscripts Docs**](../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../globals.md) / [node](../../../README.md) / [cryptography](../README.md) / aes\_192\_encrypt\_file

# Function: aes\_192\_encrypt\_file()

> **aes\_192\_encrypt\_file**(`password`, `input_file`, `output_file`): `Promise`\<`void`\>

Performs in memory AES-192 encryption of a file given the supplied password. 
The encrypted output cipher is prepended with the randomly generated 16 byte initialization vector (iv) prior to writing to disk. 
See aes_192_decrypt_file for more information on decryption.

## Parameters

• **password**: `string`

Password to use for encryption

• **input\_file**: `string`

File to encrypt

• **output\_file**: `string`

Path (including extension) to write the encrypted file to

## Returns

`Promise`\<`void`\>

## Defined in

[packages/ts\_node/src/cryptography.ts:130](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_node/src/cryptography.ts#L130)
