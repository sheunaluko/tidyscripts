[**Tidyscripts Docs**](../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../globals.md) / [node](../../../README.md) / [http](../README.md) / post\_with\_headers\_get\_json

# Function: post\_with\_headers\_get\_json()

> **post\_with\_headers\_get\_json**(`url`, `params`, `headers`): `Promise`\<`any`\>

Takes a url, and data in form of URLSearchParams, and header, then performs http POST request and converts result to json
then returns the json.

## Parameters

• **url**: `string`

• **params**: `URLSearchParams`

• **headers**: `any`

## Returns

`Promise`\<`any`\>

## Example

Heres a post example that returns a json object. 
```
const params = new URLSearchParams();
params.append('a', 1);
let headers = {} ; 
let url = "" ; 
let result = await post_with_headers_get_json(url, params, headers) ; 
```

## Defined in

[packages/ts\_node/src/http.ts:52](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_node/src/http.ts#L52)
