[**Tidyscripts Docs**](../../../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../../../globals.md) / [node](../../../../../README.md) / [common](../../../README.md) / [asnc](../README.md) / wait\_until

# Function: wait\_until()

> **wait\_until**(`f`, `timeout`?, `rate`?): `Promise`\<`unknown`\>

Waits until the specified function "f" returns true to resume executation.
Checks every "rate" milliseconds to see if f is true.
Timeouts after "timeout" ms and returns "True" for timeout
```
let timeout = await wait_until( f, 2000, 500 ) ;
if (timeout) { ... }  else {  }  ;
```

## Parameters

• **f**

• **timeout?**: `number`

• **rate?**: `number`

## Returns

`Promise`\<`unknown`\>

## Defined in

packages/ts\_common/dist/async.d.ts:13
