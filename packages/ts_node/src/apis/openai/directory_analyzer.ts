/**
 *
 * Sun Jun  9 03:06:25 CDT 2024
 * This module provides functions to count tokens in text, read a repository's context,
 * and query the GPT-4o model with the repository's context and a user query.
 * It ensures the token limit is not exceeded and provides meaningful error messages if it is.
 *
 * It supports using an ignore file (gitignore syntax) as well as an additional_ignore array
 * For excluding files from the analysis. Note that it seems illogical to include 
 * binary files in the analysis and 
 *  
 * Needed updates: Handle binary files like png and svg specially. 
 *
 * Generated with the help of ChatGPT GPT-4o web interface.
 * @packageDocumentation
 */

import tiktoken from "tiktoken";
import ignore from "ignore";
import * as fs from 'fs';
import * as path from 'path';
import * as tsw from "tidyscripts_web";
import { OpenAI } from 'openai';

// Create client
export const openai = new OpenAI(); //default for v4 is to use the env var for API key

// Create a logging object
const log = tsw.common.logger.get_logger({ id: "directory_analyzer" });

// Define the maximum tokens for the gpt-4o model
const MAX_TOKENS = 128000;

// Initialize the tokenizer for the gpt-4o model
const enc = tiktoken.encoding_for_model("gpt-4o");

/**
 * Count the number of tokens in a given text.
 * @param text - The text to be tokenized.
 * @returns The number of tokens in the text.
 */
function count_tokens(text: string): number {
    //log(`Counting tokens for the provided text: ${text}`);
    return enc.encode(text).length;
}

/**
 * Get a list of files with their sizes, sorted by size in descending order.
 * @param files - The list of file paths.
 * @param baseDir - The base directory for relative paths.
 * @returns A sorted list of tuples with file paths and their sizes.
 */
function get_files_with_sizes(files, baseDir) {
    const fileSizes = files.map(file => {
        const filePath = path.join(baseDir, file);
        const fileSize = fs.statSync(filePath).size;
        return [file, fileSize];
    });

    fileSizes.sort((a, b) => b[1] - a[1]);

    return fileSizes;
}

interface DirectoryNode {
    name: string;
    type: 'directory' | 'file';
    children?: DirectoryNode[];
}

interface Result {
    directory_structure: DirectoryNode;
    folders: { parsed: string[]; skipped: string[] };
    files: { parsed: [string, number][]; skipped: string[] };
}

/**
 * Retrieves the JSON structure from the repository directory, excluding paths specified in .gitignore and additional ignored paths.
 * @param dir - The directory path.
 * @param gitignore_path - Optional path to the .gitignore file.
 * @param additional_ignored_paths - Optional array of additional relative paths to be ignored.
 * @returns The JSON structure of the directory, folders, and files objects indicating parsed and skipped items.
 */
function get_repository_json(
    dir: string,
    gitignore_path?: string,
    additional_ignored_paths?: string[]
): Result {
    const ig = ignore();
    let folders = { parsed: [] as string[], skipped: [] as string[] };
    let files = { parsed: [] as [string, number][], skipped: [] as string[] };

    if (gitignore_path) {
        const gitignore_content = fs.readFileSync(gitignore_path, 'utf-8');
        let gitignore_lines = gitignore_content.split('\n').filter(line => line.trim() !== ''); // Split and filter empty lines
        gitignore_lines.push('.git'); // Add an entry for .git

        log(`Ignoring: ${gitignore_lines.join('\n')}`);
        ig.add(gitignore_lines);
    }

    if (additional_ignored_paths) {
        ig.add(additional_ignored_paths);
        log(`Additionally ignoring: ${additional_ignored_paths.join('\n')}`);
    }

    function read_directory(directory: string): DirectoryNode {
        const dir_node: DirectoryNode = {
            name: path.relative(dir, directory),
            type: 'directory',
            children: []
        };

        log(`Reading directory: ${directory}`);
        folders.parsed.push(dir_node.name);
        const dir_files = fs.readdirSync(directory);

        for (const file of dir_files) {
            const file_path = path.join(directory, file);
            const relative_path = path.relative(dir, file_path);

            try {
                const stat = fs.statSync(file_path);

                if (stat.isDirectory()) {
                    if (!ig.ignores(relative_path)) {
                        const sub_dir_node = read_directory(file_path);
                        dir_node.children!.push(sub_dir_node);
                    } else {
                        log(`Skipping directory: ${relative_path}`);
                        folders.skipped.push(relative_path);
                    }
                } else {
                    if (!ig.ignores(relative_path)) {
                        dir_node.children!.push({
                            name: relative_path,
                            type: 'file'
                        });
                        files.parsed.push([relative_path, stat.size]);
                    } else {
                        log(`Skipping file: ${relative_path}`);
                        files.skipped.push(relative_path);
                    }
                }

            } catch (error) {
                log(`ERROR reading file: ${relative_path}`);
                log(error);
                files.skipped.push(relative_path);
            }
        }

        return dir_node;
    }

    const directory_structure = read_directory(dir);

    // Sort files by size in descending order
    files.parsed.sort((a, b) => b[1] - a[1]);

    return {
        directory_structure,
        folders,
        files
    };
}

/**
 * Retrieves the context from the repository directory, including file names and content for specified files.
 * @param dir - The directory path.
 * @param gitignore_path - Optional path to the .gitignore file.
 * @param additional_ignored_paths - Optional array of additional relative paths to be ignored.
 * @returns A text string including file names and their content.
 */
function get_repository_context(
    dir: string,
    gitignore_path?: string,
    additional_ignored_paths?: string[]
): string {
    const { directory_structure } = get_repository_json(dir, gitignore_path, additional_ignored_paths);

    function traverse_directory(node: DirectoryNode): string {
        let content = '';
        if (node.type === 'file') {
            const file_content = fs.readFileSync(path.join(dir, node.name), 'utf-8');
            content += `---FILE: ${node.name}---\n${file_content}\n\n`;
        } else if (node.type === 'directory') {
            for (const child of node.children!) {
                content += traverse_directory(child);
            }
        }
        return content;
    }

    return traverse_directory(directory_structure);
}


/**
 * Calculate the number of tokens in a given prompt.
 * @param prompt - The prompt string to be tokenized.
 * @returns The number of tokens in the prompt.
 */
function count_tokens_in_prompt(prompt: string): number {
    return enc.encode(prompt).length;
}

/**
 * Combines the repository context and the user query into a single prompt.
 * @param dir - The directory containing the repository files.
 * @param user_query - The user's question.
 * @param gitignorePath - Optional path to the .gitignore file.
 * @param additional_ignored_paths - Optional array of additional relative paths to be ignored.
 * @returns The combined prompt.
 */
function get_prompt_with_context(dir: string, user_query: string, gitignorePath?: string, additionalIgnorePath?: string[]): string {
    const context = get_repository_context(dir, gitignorePath, additionalIgnorePath);
    return `You are a helpful assistant specialized in code analysis. Here is the repository context:\n\n -- CONTEXT START -- ${context}\n\n -- CONTENT END -- User query: ${user_query}`;
}

/**
 * Extracts the first text response from the given OpenAI API response object.
 * If the response does not contain a valid message, throws an error with detailed logging.
 * @param response - The OpenAI API response object.
 * @returns The first text response from the assistant.
 * @throws Error if the response does not contain a valid message.
 */
function extract_first_text_response(response: any): string {
    try {
        if (response && response.choices && response.choices.length > 0) {
            const message = response.choices[0].message;
            if (message && message.content) {
                return message.content;
            } else {
                log(`Response object: ${JSON.stringify(response, null, 2)}`);
                throw new Error("Response does not contain a valid message content.");
            }
        } else {
            log(`Response object: ${JSON.stringify(response, null, 2)}`);
            throw new Error("Response does not contain any choices.");
        }
    } catch (error : any) {
        log(`Error extracting text response: ${error.message}`);
        log(`Response object: ${JSON.stringify(response, null, 2)}`);
        throw new Error(`Failed to extract text response: ${error.message}`);
    }
}

/**
 * Summarizes the token information for a user question and repository context.
 * @param dir - The directory containing the repository files.
 * @param user_query - The user's question.
 * @param gitignorePath - Optional path to the .gitignore file.
 * @param additional_ignored_paths - Optional array of additional relative paths to be ignored.
 * @returns An object summarizing the number of tokens for the directory, user prompt, combined generated prompt, and remaining tokens.
 * @throws Error if the token limit is exceeded.
 */
function summarize_token_information(dir: string, user_query: string, gitignorePath?: string, additionalIgnorePath?: string[]) {
    const context = get_repository_context(dir, gitignorePath, additionalIgnorePath);
    const prompt = get_prompt_with_context(dir, user_query, gitignorePath,additionalIgnorePath);
    const prompt_tokens = count_tokens(prompt);
    const remaining_tokens = MAX_TOKENS - prompt_tokens;

    if (remaining_tokens <= 0) {
	throw new Error(`Token limit exceeded. Tokens remaining for user query: ${remaining_tokens}, Prompt size without user query: ${prompt_tokens - count_tokens(user_query)}`);
    }

    return {
	directory_tokens: count_tokens(context),
	user_prompt_tokens: count_tokens(user_query),
	combined_prompt_tokens: prompt_tokens,
	remaining_tokens: remaining_tokens
    };
}

/**
 * Query GPT-4o with a user question and repository context.
 * @param dir - The directory containing the repository files.
 * @param user_query - The user's question.
 * @param gitignorePath - Optional path to the .gitignore file.
 * @param additional_ignored_paths - Optional array of additional relative paths to be ignored.
 * @returns The response from GPT-4o.
 * @throws Error if the token limit is exceeded.
 */
async function query_gpt4o_with_repository_context(dir: string, user_query: string, gitignorePath?: string, additionalIgnorePath? : string[]): Promise<string> {
    const prompt = get_prompt_with_context(dir, user_query, gitignorePath,additionalIgnorePath);
    const prompt_tokens = count_tokens_in_prompt(prompt);
    const remaining_tokens = MAX_TOKENS - prompt_tokens;

    if (remaining_tokens <= 0) {
        throw new Error(`Token limit exceeded. Tokens remaining for user query: ${remaining_tokens}, Prompt size without user query: ${prompt_tokens - count_tokens(user_query)}`);
    }

    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            { role: 'system', content: 'You are a helpful assistant specialized in code analysis.' },
            { role: 'user', content: prompt },
        ],
    });

    let completion = extract_first_text_response(response);
    return completion;
}

export {
    count_tokens,
    get_repository_context,
    get_repository_json,    
    count_tokens_in_prompt,
    get_prompt_with_context,
    query_gpt4o_with_repository_context,
    summarize_token_information,
}
