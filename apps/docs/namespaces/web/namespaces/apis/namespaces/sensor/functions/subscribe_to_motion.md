[**Tidyscripts Docs**](../../../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../../../globals.md) / [web](../../../../../README.md) / [apis](../../../README.md) / [sensor](../README.md) / subscribe\_to\_motion

# Function: subscribe\_to\_motion()

> **subscribe\_to\_motion**(`id`, `handler`): `void`

Subscribe to motion events, for example ~> 
```
let handler = function(e) { 
   let {acceleration, rotationRate} = e ; 
   let {x,y,z} = acceleration ; 
   let {alpha, beta, gamma} = rotationRate ; 
   console.log(`x,y,z,alpha,beta,gamma=${x},${y},${z},${alpha},${beta},${gamma}`)
} 
//now we use the function
subscribe_to_motion('unique_id', handler)
```

## Parameters

• **id**: `string`

• **handler**

## Returns

`void`

## Defined in

[packages/ts\_web/src/apis/sensor/index.ts:78](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_web/src/apis/sensor/index.ts#L78)
