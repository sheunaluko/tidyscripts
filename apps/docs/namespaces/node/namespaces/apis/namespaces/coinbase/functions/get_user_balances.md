[**Tidyscripts Docs**](../../../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../../../globals.md) / [node](../../../../../README.md) / [apis](../../../README.md) / [coinbase](../README.md) / get\_user\_balances

# Function: get\_user\_balances()

> **get\_user\_balances**(`params`): `Promise`\<`object`\>

Returns all user balances on both coinbase.com and pro.coinbase.com
Summarizes the usd value

## Parameters

• **params**: [`CoinbaseUserDataParams`](../type-aliases/CoinbaseUserDataParams.md)

Dictionary containing the api key and api secret and passphrase

## Returns

`Promise`\<`object`\>

### coinbase

> **coinbase**: `any`[]

### coinbase\_pro

> **coinbase\_pro**: `any`[]

### coinbase\_pro\_total\_usd

> **coinbase\_pro\_total\_usd**: `number`

### coinbase\_total\_usd

> **coinbase\_total\_usd**: `number`

### total\_usd

> **total\_usd**: `number`

## Defined in

[packages/ts\_node/src/apis/coinbase.ts:102](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_node/src/apis/coinbase.ts#L102)
