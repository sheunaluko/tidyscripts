[**Tidyscripts Docs**](../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../globals.md) / [node](../../../README.md) / [cryptography](../README.md) / hmac

# Function: hmac()

> **hmac**(`params`): `string`

Computes hmac 
```typescript
let hex = hmac({algorithm: "sha256", secret : 'my secret', data : 'my data', digest : 'hex'}) 
```

## Parameters

• **params**: [`HmacParams`](../type-aliases/HmacParams.md)

## Returns

`string`

## Defined in

[packages/ts\_node/src/cryptography.ts:30](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_node/src/cryptography.ts#L30)
