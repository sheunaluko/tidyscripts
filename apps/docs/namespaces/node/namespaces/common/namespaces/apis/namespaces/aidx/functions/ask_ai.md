[**Tidyscripts Docs**](../../../../../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../../../../../globals.md) / [node](../../../../../../../README.md) / [common](../../../../../README.md) / [apis](../../../README.md) / [aidx](../README.md) / ask\_ai

# Function: ask\_ai()

> **ask\_ai**(`prompt`, `max_tokens`): `Promise`\<[`ApiResult`](../type-aliases/ApiResult.md)\>

This uses the Tidyscripts publicly provided API endpoint for OpenAI.
Because it is implemented in Tidyscripts.common this function can be called from the browser or from server side node.
There is no cost to use the API since the maintainer of Tidyscripts provides it for free (for now)
Please be very respectful of its use, and contact alukosheun@gmail.com for any questions or concerns.

To use the function, simply:
```
import * as ts from 'tidyscripts_node' //if you are on front end import 'tidyscripts_web'
let prompt = `your prompt here`
let max_tokens = 500 //max tokens to return (helps to limit large responses and reduce api usage)
let response = await ts.common.apis.aidx.ask_ai(prompt,max_tokens)
```

We want to be able to test and improve the API endpoints, especially when running locally.
One way to configure this (in the source code which is linked) would be to set the api url as localhost:3000/api or as tidyscripts.com/api depending on an enviroment var
This will not work because the code in the browser does not have process.env
Thus we use the Tidyscripts utility function common.util.is_browser() to check if we
are runnign on the browser, and we construct the URL appropriately before proceeding with the request.

## Parameters

• **prompt**: `string`

• **max\_tokens**: `number`

## Returns

`Promise`\<[`ApiResult`](../type-aliases/ApiResult.md)\>

## Defined in

packages/ts\_common/dist/apis/aidx.d.ts:39
