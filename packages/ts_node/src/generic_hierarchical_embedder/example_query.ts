/**
 * Example usage of the Generic Hierarchical Embedder query functionality
 */

import * as ghe from './main';

// ============================================================================
// Example 1: Simple Query
// ============================================================================

async function example1_simple_query() {
    console.log('=== Example 1: Simple Query ===\n');

    // Search for code related to "database connection"
    const results = await ghe.query.searchBySimilarity(
        "database connection",
        { limit: 3 }
    );

    console.log(`Found ${results.length} results:\n`);

    for (const result of results) {
        console.log(`- ${result.fileName} (${(result.similarity * 100).toFixed(1)}% similar)`);
        console.log(`  File: ${result.filePath}`);
        console.log(`  Lines: ${result.chunk.startLine}-${result.chunk.endLine}`);
        console.log(`  Preview: ${result.chunk.content.substring(0, 100)}...`);
        console.log();
    }
}

// ============================================================================
// Example 2: Query with Filters
// ============================================================================

async function example2_filtered_query() {
    console.log('=== Example 2: Query with Filters ===\n');

    // Search only in TypeScript files with higher threshold
    const results = await ghe.query.searchBySimilarity(
        "authentication and authorization logic",
        {
            limit: 5,
            threshold: 0.7,  // Only show highly relevant results
            fileExtensions: ['.ts', '.tsx']  // TypeScript only
        }
    );

    console.log(`Found ${results.length} highly relevant TypeScript results:\n`);

    for (const result of results) {
        console.log(`Similarity: ${(result.similarity * 100).toFixed(1)}%`);
        console.log(`File: ${result.filePath}`);
        console.log(`Content:\n${result.chunk.content}\n`);
        console.log('---\n');
    }
}

// ============================================================================
// Example 3: Get Markdown Context for Agent
// ============================================================================

async function example3_markdown_context() {
    console.log('=== Example 3: Markdown Context for Agent ===\n');

    // Get markdown-formatted context ready for an AI agent
    const markdown = await ghe.query.queryForMarkdown(
        "error handling and logging",
        { limit: 3, threshold: 0.6 }
    );

    console.log(markdown);
}

// ============================================================================
// Example 4: Get Plain Text Context
// ============================================================================

async function example4_plain_text() {
    console.log('=== Example 4: Plain Text Context ===\n');

    const text = await ghe.query.queryForPlainText(
        "data validation functions",
        { limit: 2, threshold: 0.65 }
    );

    console.log(text);
}

// ============================================================================
// Example 5: Custom Context Processing
// ============================================================================

async function example5_custom_processing() {
    console.log('=== Example 5: Custom Context Processing ===\n');

    // Get structured context object
    const context = await ghe.query.queryForContext(
        "API endpoint handlers",
        { limit: 5, threshold: 0.6 }
    );

    console.log(`Query: "${context.query}"`);
    console.log(`Total Results: ${context.totalResults}`);
    console.log(`Generated: ${context.generatedAt.toISOString()}\n`);

    // Process each result
    for (const block of context.results) {
        console.log(`File: ${block.filePath}`);
        console.log(`Relevance: ${(block.relevanceScore * 100).toFixed(1)}%`);
        console.log(`Location: ${block.lineRange}`);
        console.log(`Content Length: ${block.content.length} characters`);
        console.log(`Chunk ID: ${block.metadata.chunkId}`);
        console.log();
    }
}

// ============================================================================
// Example 6: Project-Specific Search
// ============================================================================

async function example6_project_specific() {
    console.log('=== Example 6: Project-Specific Search ===\n');

    // First, you need the project ID (from embedding the directory)
    // This would come from embed_and_store_directory()
    const projectId = 'project:abc123...'; // Example project ID

    const results = await ghe.query.searchBySimilarity(
        "user authentication",
        {
            limit: 3,
            projectId: projectId  // Only search within this project
        }
    );

    console.log(`Results from project ${projectId}:\n`);
    results.forEach((r, i) => {
        console.log(`${i + 1}. ${r.fileName} (${(r.similarity * 100).toFixed(1)}%)`);
    });
}

// ============================================================================
// Example 7: Complete Workflow - Embed and Query
// ============================================================================

async function example7_complete_workflow() {
    console.log('=== Example 7: Complete Workflow ===\n');

    // Step 1: Embed and store a directory
    console.log('Step 1: Embedding directory...');
    const embedResult = await ghe.embed_and_store_directory('/path/to/project', {
        fileExtensions: ['.ts', '.tsx', '.js'],
        costLimit: 0.50,
        deleteExisting: true
    });

    console.log(`✓ Embedded ${embedResult.chunkStats.numChunks} chunks`);
    console.log(`✓ Project ID: ${embedResult.storageStats.projectId}\n`);

    // Step 2: Query the embedded code
    console.log('Step 2: Querying for relevant code...');
    const queryResults = await ghe.query.searchBySimilarity(
        "function that processes user input",
        {
            limit: 3,
            projectId: embedResult.storageStats.projectId,
            threshold: 0.65
        }
    );

    console.log(`✓ Found ${queryResults.length} relevant results\n`);

    // Step 3: Format for agent
    console.log('Step 3: Formatting context for AI agent...');
    const agentContext = ghe.query.formatAsAgentContext(
        "function that processes user input",
        queryResults
    );

    const markdown = ghe.query.contextToMarkdown(agentContext);
    console.log('✓ Context ready:\n');
    console.log(markdown);
}

// ============================================================================
// Example 8: Low-Level API Usage
// ============================================================================

async function example8_low_level() {
    console.log('=== Example 8: Low-Level API ===\n');

    // Directly use searchBySimilarity for full control
    const results = await ghe.query.searchBySimilarity(
        "database transaction handling",
        {
            limit: 10,
            threshold: 0.5,
            fileExtensions: ['.ts'],
            model: 'text-embedding-3-small',
            dimensions: 1536
        }
    );

    // Custom processing of results
    const topResults = results.slice(0, 3);
    const aggregatedContent = topResults
        .map(r => r.chunk.content)
        .join('\n\n---\n\n');

    console.log('Aggregated top 3 results:\n');
    console.log(aggregatedContent);
}

// ============================================================================
// Example 9: Comparing Different Queries
// ============================================================================

async function example9_compare_queries() {
    console.log('=== Example 9: Comparing Queries ===\n');

    const queries = [
        "database operations",
        "user authentication",
        "error handling",
        "API endpoints"
    ];

    for (const query of queries) {
        const results = await ghe.query.searchBySimilarity(query, {
            limit: 3,
            threshold: 0.6
        });

        console.log(`Query: "${query}"`);
        console.log(`Results: ${results.length}`);
        if (results.length > 0) {
            const avgSimilarity = results.reduce((sum, r) => sum + r.similarity, 0) / results.length;
            console.log(`Avg Similarity: ${(avgSimilarity * 100).toFixed(1)}%`);
        }
        console.log();
    }
}

// ============================================================================
// Example 10: Building RAG Context for LLM
// ============================================================================

async function example10_rag_context() {
    console.log('=== Example 10: RAG Context for LLM ===\n');

    const userQuestion = "How do I handle database errors in this codebase?";

    // Get relevant context
    const context = await ghe.query.queryForContext(userQuestion, {
        limit: 5,
        threshold: 0.6
    });

    // Build prompt for LLM
    const llmPrompt = `
You are a helpful coding assistant. Answer the user's question based on the following code context.

USER QUESTION:
${userQuestion}

RELEVANT CODE CONTEXT:
${ghe.query.contextToPlainText(context)}

Please provide a detailed answer based on the code context above.
`;

    console.log('LLM Prompt:\n');
    console.log(llmPrompt);
}

// ============================================================================
// Run Examples
// ============================================================================

async function runAllExamples() {
    try {
        // Uncomment the examples you want to run:

        // await example1_simple_query();
        // await example2_filtered_query();
        // await example3_markdown_context();
        // await example4_plain_text();
        // await example5_custom_processing();
        // await example6_project_specific();
        // await example7_complete_workflow();
        // await example8_low_level();
        // await example9_compare_queries();
        // await example10_rag_context();

    } catch (error) {
        console.error('Error running examples:', error);
    }
}

// Run if called directly
if (require.main === module) {
    runAllExamples();
}

export {
    example1_simple_query,
    example2_filtered_query,
    example3_markdown_context,
    example4_plain_text,
    example5_custom_processing,
    example6_project_specific,
    example7_complete_workflow,
    example8_low_level,
    example9_compare_queries,
    example10_rag_context
};
