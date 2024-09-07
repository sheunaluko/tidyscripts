[**Tidyscripts Docs**](../../../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../../../globals.md) / [node](../../../../../README.md) / [apis](../../../README.md) / [bots](../README.md) / get\_chat\_bot\_brain

# Function: get\_chat\_bot\_brain()

> **get\_chat\_bot\_brain**(`chat_bot_system_msg`): `RunnableWithMessageHistory`\<`any`, `AIMessageChunk`\>

Returns the "brain" of the chat_bot. The brain accepts an input string and returns an output string
The functionality of the bot is specified by the system message, which is passed as a string

## Parameters

• **chat\_bot\_system\_msg**: `string`

A string specifying the desired system message

## Returns

`RunnableWithMessageHistory`\<`any`, `AIMessageChunk`\>

## Defined in

[packages/ts\_node/src/apis/bots.ts:188](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_node/src/apis/bots.ts#L188)
