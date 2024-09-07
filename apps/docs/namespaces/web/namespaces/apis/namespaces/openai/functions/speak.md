[**Tidyscripts Docs**](../../../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../../../globals.md) / [web](../../../../../README.md) / [apis](../../../README.md) / [openai](../README.md) / speak

# Function: speak()

> **speak**(`input`): `Promise`\<`object`\>

TTS. Uses openai api to generate speech; loads it into an audio element and starts the speech. 
Returns the audio element which can be paused, etc ; as well as the blob which can be evaluated 
for raw audio waveform

## Parameters

• **input**: `string`

## Returns

`Promise`\<`object`\>

### audio\_element

> **audio\_element**: `any`

### blob

> **blob**: `any`

## Defined in

[packages/ts\_web/src/apis/openai.ts:43](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_web/src/apis/openai.ts#L43)
