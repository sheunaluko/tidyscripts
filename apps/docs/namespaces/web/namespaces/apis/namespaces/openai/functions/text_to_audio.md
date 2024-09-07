[**Tidyscripts Docs**](../../../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../../../globals.md) / [web](../../../../../README.md) / [apis](../../../README.md) / [openai](../README.md) / text\_to\_audio

# Function: text\_to\_audio()

> **text\_to\_audio**(`input`): `Promise`\<`object`\>

Converts input text into a blob and corresponding audio element which are both returned. 
The blob can be used for the raw audio data 
The audio element can play the audio using Element.play() and Element.pause()

## Parameters

• **input**: `string`

## Returns

`Promise`\<`object`\>

### audio\_element

> **audio\_element**: `any`

### blob

> **blob**: `any`

## Defined in

[packages/ts\_web/src/apis/openai.ts:58](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_web/src/apis/openai.ts#L58)
