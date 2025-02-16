import * as fu from "../../../src/firebase_utils"


export async function get_tidyscripts_collections() {
    let r = await fu.get_user_collection_registry()
    return r?.collections.tidyscripts.collections 
}

/**
 * Tokenize text into an array, treating newline characters ('\n') as separate tokens,
 * removing punctuation, and keeping all words (no stop-word removal).
 *
 * @param text - The input string to tokenize.
 * @returns Array of tokens, where '\n' appears as its own token, and punctuation is removed.
 */
export function tokenize_text(text: string): string[] {
    // 1) Normalize carriage returns so all newlines are just '\n'.
    //    (This helps on Windows, which uses "\r\n".)
    const unified = text
	.replace(/\r\n/g, "\n")
	.replace(/\r/g, "\n");

    // 2) Split using a capturing group that *retains* the newline itself in the output array.
    //    e.g. "Hello\nWorld" -> ["Hello", "\n", "World"]
    const segments = unified.split(/(\n)/);

    // 3) For each segment:
    //    - If it's exactly "\n", keep it as a single token.
    //    - Otherwise:
    //      a) Remove punctuation by replacing any non-letter/digit/whitespace with a space.
    //      b) Split by one or more spaces to get individual words/tokens.
    // 4) Filter out any empty tokens (e.g., multiple spaces).
    const tokens = segments.flatMap((segment) => {
	if (segment === "\n") {
	    // Keep newline as a separate token
	    return ["\n"];
	} else {

	    // Split on whitespace
	    const splitWords = segment.split(/\s+/);

	    // Remove punctuation at the start or end of each token
	    // - The regex:  /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu
	    //   Matches 1+ non-letter/digit characters at the start (^) OR end ($)
	    // - This preserves punctuation inside the token.
	    const cleaned = splitWords.map(word =>
		word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "")
	    );

	    // Filter out empty strings that might occur from extra spaces or punctuation
	    return cleaned.filter(token => token !== "").map( (x:string) => x.toLowerCase() ) ;
	    
	}
    }).filter(token => token !== "");

    return tokens;
}
