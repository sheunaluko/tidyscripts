[**Tidyscripts Docs**](../../../../../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../../../../../globals.md) / [node](../../../../../../../README.md) / [apis](../../../../../README.md) / [openai](../../../README.md) / [directory\_analyzer](../README.md) / query\_gpt4o\_with\_repository\_context

# Function: query\_gpt4o\_with\_repository\_context()

> **query\_gpt4o\_with\_repository\_context**(`dir`, `user_query`, `gitignorePath`?, `additionalIgnorePath`?): `Promise`\<`string`\>

Query GPT-4o with a user question and repository context.

## Parameters

• **dir**: `string`

The directory containing the repository files.

• **user\_query**: `string`

The user's question.

• **gitignorePath?**: `string`

Optional path to the .gitignore file.

• **additionalIgnorePath?**: `string`[]

## Returns

`Promise`\<`string`\>

The response from GPT-4o.

## Throws

Error if the token limit is exceeded.

## Defined in

[packages/ts\_node/src/apis/openai/directory\_analyzer.ts:285](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_node/src/apis/openai/directory_analyzer.ts#L285)
