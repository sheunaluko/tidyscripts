[**Tidyscripts Docs**](../../../../../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../../../../../globals.md) / [node](../../../../../../../README.md) / [apis](../../../../../README.md) / [openai](../../../README.md) / [directory\_analyzer](../README.md) / get\_repository\_json

# Function: get\_repository\_json()

> **get\_repository\_json**(`dir`, `gitignore_path`?, `additional_ignored_paths`?): `Result`

Retrieves the JSON structure from the repository directory, excluding paths specified in .gitignore and additional ignored paths.

## Parameters

• **dir**: `string`

The directory path.

• **gitignore\_path?**: `string`

Optional path to the .gitignore file.

• **additional\_ignored\_paths?**: `string`[]

Optional array of additional relative paths to be ignored.

## Returns

`Result`

The JSON structure of the directory, folders, and files objects indicating parsed and skipped items.

## Defined in

[packages/ts\_node/src/apis/openai/directory\_analyzer.ts:84](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_node/src/apis/openai/directory_analyzer.ts#L84)
