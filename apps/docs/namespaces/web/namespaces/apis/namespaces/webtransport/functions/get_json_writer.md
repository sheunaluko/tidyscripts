[**Tidyscripts Docs**](../../../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../../../globals.md) / [web](../../../../../README.md) / [apis](../../../README.md) / [webtransport](../README.md) / get\_json\_writer

# Function: get\_json\_writer()

> **get\_json\_writer**(`url`): `any`

Main entry point; see usage below.
Creates a webtransport session with the specified URL and then
returns a writer object. The writer objects 
accepts json via obj.write_json(json). 

```
let r = get_json_writer("https://localhost:1234/webtransport")
r.write_json({'msg': 'init' , 'time' : (new Date())})
```

## Parameters

• **url**: `string`

## Returns

`any`

## Defined in

[packages/ts\_web/src/apis/webtransport.ts:60](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_web/src/apis/webtransport.ts#L60)
