[**Tidyscripts Docs**](../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../globals.md) / [common](../../../README.md) / [logger](../README.md) / get\_logger

# Function: get\_logger()

> **get\_logger**(`ops`): (`t`) => `void`

Creates a logger object based on input options. 
This is used to help separate and manage logs from submodules. 
```typescript
const log = get_logger({id: "util"}) 
log("brackets contain the submodule name") // => [util]:: brackets contain the submodule name
```

## Parameters

• **ops**: [`LoggerOps`](../interfaces/LoggerOps.md)

## Returns

`Function`

### Parameters

• **t**: `any`

### Returns

`void`

## Defined in

[packages/ts\_common/src/logger.ts:36](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_common/src/logger.ts#L36)
