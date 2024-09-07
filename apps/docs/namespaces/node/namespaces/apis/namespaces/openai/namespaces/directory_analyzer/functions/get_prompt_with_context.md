[**Tidyscripts Docs**](../../../../../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../../../../../globals.md) / [node](../../../../../../../README.md) / [apis](../../../../../README.md) / [openai](../../../README.md) / [directory\_analyzer](../README.md) / get\_prompt\_with\_context

# Function: get\_prompt\_with\_context()

> **get\_prompt\_with\_context**(`dir`, `user_query`, `gitignorePath`?, `additionalIgnorePath`?): `string`

Combines the repository context and the user query into a single prompt.

## Parameters

• **dir**: `string`

The directory containing the repository files.

• **user\_query**: `string`

The user's question.

• **gitignorePath?**: `string`

Optional path to the .gitignore file.

• **additionalIgnorePath?**: `string`[]

## Returns

`string`

The combined prompt.

## Defined in

[packages/ts\_node/src/apis/openai/directory\_analyzer.ts:216](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_node/src/apis/openai/directory_analyzer.ts#L216)
