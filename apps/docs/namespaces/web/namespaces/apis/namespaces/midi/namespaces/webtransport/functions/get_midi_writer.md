[**Tidyscripts Docs**](../../../../../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../../../../../globals.md) / [web](../../../../../../../README.md) / [apis](../../../../../README.md) / [midi](../../../README.md) / [webtransport](../README.md) / get\_midi\_writer

# Function: get\_midi\_writer()

> **get\_midi\_writer**(`url`): `any`

Given a url to a webtranport server endpoint, returns a writer object 
that has the functions 'note_on(ch,nte,vel)', 'note_off(ch,nte,vel)' and
'control_change(ch,id,val)'.
When these functions are called, the message is converted to midi byte format
and sent as a datagram over the webtranport connection

This assumes that you have a functioning webtransport server to connect to and which
parses and acts on these midi bytes.

## Parameters

• **url**: `string`

## Returns

`any`

## Defined in

[packages/ts\_web/src/apis/midi/webtransport.ts:15](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_web/src/apis/midi/webtransport.ts#L15)
