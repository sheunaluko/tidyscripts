[**Tidyscripts Docs**](../../../../../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../../../../../globals.md) / [node](../../../../../../../README.md) / [apis](../../../../../README.md) / [openai](../../../README.md) / [directory\_analyzer](../README.md) / summarize\_token\_information

# Function: summarize\_token\_information()

> **summarize\_token\_information**(`dir`, `user_query`, `gitignorePath`?, `additionalIgnorePath`?): `object`

Summarizes the token information for a user question and repository context.

## Parameters

• **dir**: `string`

The directory containing the repository files.

• **user\_query**: `string`

The user's question.

• **gitignorePath?**: `string`

Optional path to the .gitignore file.

• **additionalIgnorePath?**: `string`[]

## Returns

`object`

An object summarizing the number of tokens for the directory, user prompt, combined generated prompt, and remaining tokens.

### combined\_prompt\_tokens

> **combined\_prompt\_tokens**: `number` = `prompt_tokens`

### directory\_tokens

> **directory\_tokens**: `number`

### remaining\_tokens

> **remaining\_tokens**: `number`

### user\_prompt\_tokens

> **user\_prompt\_tokens**: `number`

## Throws

Error if the token limit is exceeded.

## Defined in

[packages/ts\_node/src/apis/openai/directory\_analyzer.ts:258](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_node/src/apis/openai/directory_analyzer.ts#L258)
