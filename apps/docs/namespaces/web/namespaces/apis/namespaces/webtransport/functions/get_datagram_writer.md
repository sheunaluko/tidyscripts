[**Tidyscripts Docs**](../../../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../../../globals.md) / [web](../../../../../README.md) / [apis](../../../README.md) / [webtransport](../README.md) / get\_datagram\_writer

# Function: get\_datagram\_writer()

> **get\_datagram\_writer**(`url`): `object`

Given a web transport url, will return a datagram writer and the transport object 
in a dictionary with keys (writer, tranport).
Use writer.write(bytes) to send a datagram

## Parameters

• **url**: `string`

## Returns

`object`

### transport

> **transport**: `any`

### writer

> **writer**: `any`

## Defined in

[packages/ts\_web/src/apis/webtransport.ts:35](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_web/src/apis/webtransport.ts#L35)
