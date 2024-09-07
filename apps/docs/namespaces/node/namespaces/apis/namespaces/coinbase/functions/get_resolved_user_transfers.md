[**Tidyscripts Docs**](../../../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../../../globals.md) / [node](../../../../../README.md) / [apis](../../../README.md) / [coinbase](../README.md) / get\_resolved\_user\_transfers

# Function: get\_resolved\_user\_transfers()

> **get\_resolved\_user\_transfers**(`params`): `Promise`\<`any`\>

Returns all user transfers (with the currencies resolved) on pro.coinbase.com
For now this is limited to 300 transfers.

## Parameters

• **params**: [`CoinbaseUserDataParams`](../type-aliases/CoinbaseUserDataParams.md)

Dictionary containing the api key and api secret and passphrase

## Returns

`Promise`\<`any`\>

## Defined in

[packages/ts\_node/src/apis/coinbase.ts:169](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_node/src/apis/coinbase.ts#L169)
