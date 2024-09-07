[**Tidyscripts Docs**](../../../../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../../../../globals.md) / [node](../../../../../../README.md) / [apis](../../../../README.md) / [openai](../../README.md) / directory\_analyzer

# directory\_analyzer

Sun Jun  9 03:06:25 CDT 2024
This module provides functions to count tokens in text, read a repository's context,
and query the GPT-4o model with the repository's context and a user query.
It ensures the token limit is not exceeded and provides meaningful error messages if it is.

It supports using an ignore file (gitignore syntax) as well as an additional_ignore array
For excluding files from the analysis. Note that it seems illogical to include 
binary files in the analysis and 
 
Needed updates: Handle binary files like png and svg specially. 

Generated with the help of ChatGPT GPT-4o web interface.

## Index

### Variables

- [openai](variables/openai.md)

### Functions

- [count\_tokens](functions/count_tokens.md)
- [count\_tokens\_in\_prompt](functions/count_tokens_in_prompt.md)
- [get\_prompt\_with\_context](functions/get_prompt_with_context.md)
- [get\_repository\_context](functions/get_repository_context.md)
- [get\_repository\_json](functions/get_repository_json.md)
- [query\_gpt4o\_with\_repository\_context](functions/query_gpt4o_with_repository_context.md)
- [summarize\_token\_information](functions/summarize_token_information.md)
