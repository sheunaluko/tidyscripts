[**Tidyscripts Docs**](../../../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../../../globals.md) / [web](../../../../../README.md) / [apis](../../../README.md) / [sensor](../README.md) / subscribe\_to\_orientation

# Function: subscribe\_to\_orientation()

> **subscribe\_to\_orientation**(`id`, `handler`): `void`

Susbcribe to orientation events 
```
let handler = function(e :any) { 
  let {alpha, beta, gamma} = e ; 
  console.log(`alpha,beta,gamma=${alpha},${beta},${gamma}`)
}

//now use the function 
subscribe_to_orientation('unique_id' , handler ) 
```

## Parameters

• **id**: `string`

• **handler**

## Returns

`void`

## Defined in

[packages/ts\_web/src/apis/sensor/index.ts:100](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_web/src/apis/sensor/index.ts#L100)
