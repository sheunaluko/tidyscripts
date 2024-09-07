[**Tidyscripts Docs**](../../../../../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../../../../../globals.md) / [node](../../../../../../../README.md) / [apis](../../../../../README.md) / [openai](../../../README.md) / [directory\_analyzer](../README.md) / get\_repository\_context

# Function: get\_repository\_context()

> **get\_repository\_context**(`dir`, `gitignore_path`?, `additional_ignored_paths`?): `string`

Retrieves the context from the repository directory, including file names and content for specified files.

## Parameters

• **dir**: `string`

The directory path.

• **gitignore\_path?**: `string`

Optional path to the .gitignore file.

• **additional\_ignored\_paths?**: `string`[]

Optional array of additional relative paths to be ignored.

## Returns

`string`

A text string including file names and their content.

## Defined in

[packages/ts\_node/src/apis/openai/directory\_analyzer.ts:175](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_node/src/apis/openai/directory_analyzer.ts#L175)
