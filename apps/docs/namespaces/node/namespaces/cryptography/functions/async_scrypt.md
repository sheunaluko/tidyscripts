[**Tidyscripts Docs**](../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../globals.md) / [node](../../../README.md) / [cryptography](../README.md) / async\_scrypt

# Function: async\_scrypt()

> **async\_scrypt**(`password`, `salt`, `length`): `Promise`\<`unknown`\>

Async scrypt function for computing encryption key.
This is a wrapper around the builtin scrypt function using util.promisify

## Parameters

• **password**: `string`

the password

• **salt**: `string`

the salt

• **length**: `number`

## Returns

`Promise`\<`unknown`\>

## Defined in

[packages/ts\_node/src/cryptography.ts:46](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_node/src/cryptography.ts#L46)
