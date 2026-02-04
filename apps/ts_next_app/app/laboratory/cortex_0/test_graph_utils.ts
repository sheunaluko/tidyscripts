'use client';

/**
 * Test suite for graph_utils
 * Run from browser console: await window.test_graph_utils()
 */

import * as graph_utils from "./graph_utils";
import * as fbu from "../../../src/firebase_utils";

type TestResult = {
    name: string;
    passed: boolean;
    output: any;
    error?: string;
};

async function run_tests(): Promise<string> {
    const results: TestResult[] = [];
    const output_lines: string[] = [];

    output_lines.push("=".repeat(60));
    output_lines.push("GRAPH UTILS TEST SUITE");
    output_lines.push("=".repeat(60));
    output_lines.push("");

    // Test 1: normalize_id
    try {
        const test_cases = [
            ["Albert Einstein", "albert_einstein"],
            ["San Francisco", "san_francisco"],
            ["hello-world!", "helloworld"],
            ["  spaces  ", "spaces"],
        ];
        let all_passed = true;
        const outputs: string[] = [];

        for (const [input, expected] of test_cases) {
            const result = graph_utils.normalize_id(input);
            const passed = result === expected;
            all_passed = all_passed && passed;
            outputs.push(`  "${input}" -> "${result}" ${passed ? "✓" : `✗ (expected "${expected}")`}`);
        }

        results.push({ name: "normalize_id", passed: all_passed, output: outputs });
        output_lines.push(`[${all_passed ? "PASS" : "FAIL"}] normalize_id`);
        outputs.forEach(o => output_lines.push(o));
        output_lines.push("");
    } catch (e: any) {
        results.push({ name: "normalize_id", passed: false, output: null, error: e.message });
        output_lines.push(`[FAIL] normalize_id - Error: ${e.message}`);
        output_lines.push("");
    }

    // Test 2: generate_relation_id
    try {
        const result = graph_utils.generate_relation_id("shay", "created", "tidyscripts");
        const expected = "shay_created_tidyscripts";
        const passed = result === expected;

        results.push({ name: "generate_relation_id", passed, output: result });
        output_lines.push(`[${passed ? "PASS" : "FAIL"}] generate_relation_id`);
        output_lines.push(`  ("shay", "created", "tidyscripts") -> "${result}"`);
        output_lines.push("");
    } catch (e: any) {
        results.push({ name: "generate_relation_id", passed: false, output: null, error: e.message });
        output_lines.push(`[FAIL] generate_relation_id - Error: ${e.message}`);
        output_lines.push("");
    }

    // Test 3: parse_triples
    try {
        const triples: graph_utils.Triple[] = [
            ["Shay", "created", "Tidyscripts"],
            ["Tidyscripts", "is_a", "Framework"],
            ["Shay", "lives_in", "San Francisco"],
            ["Shay", "created", "Tidyscripts"], // duplicate
        ];

        const parsed = graph_utils.parse_triples(triples);
        const entityCount = parsed.entityIds.size;
        const relationCount = parsed.relations.size;

        const passed = entityCount === 4 && relationCount === 3; // 4 unique entities, 3 unique relations

        results.push({ name: "parse_triples", passed, output: { entityCount, relationCount } });
        output_lines.push(`[${passed ? "PASS" : "FAIL"}] parse_triples`);
        output_lines.push(`  Input: ${triples.length} triples (1 duplicate)`);
        output_lines.push(`  Entities: ${entityCount} (expected 4)`);
        output_lines.push(`  Relations: ${relationCount} (expected 3)`);
        output_lines.push(`  Entity IDs: ${[...parsed.entityIds].join(", ")}`);
        output_lines.push(`  Relation IDs: ${[...parsed.relations.keys()].join(", ")}`);
        output_lines.push("");
    } catch (e: any) {
        results.push({ name: "parse_triples", passed: false, output: null, error: e.message });
        output_lines.push(`[FAIL] parse_triples - Error: ${e.message}`);
        output_lines.push("");
    }

    // Test 4: build_insert_query (structure only, no DB)
    try {
        const entities = [
            { id: "test_entity_1", embedding: [0.1, 0.2, 0.3] },
            { id: "test_entity_2", embedding: [0.4, 0.5, 0.6] },
        ];
        const relations = [
            { id: "test_entity_1_knows_test_entity_2", sourceId: "test_entity_1", targetId: "test_entity_2", kind: "knows", embedding: [0.7, 0.8, 0.9] },
        ];

        const query = graph_utils.build_insert_query(entities, relations);
        const hasEntities = query.includes('type::thing("user_entities", "test_entity_1")');
        const hasRelations = query.includes('type::thing("user_entities", "test_entity_1")') && query.includes('kind: "knows"');
        const passed = hasEntities && hasRelations;

        results.push({ name: "build_insert_query", passed, output: query.substring(0, 200) + "..." });
        output_lines.push(`[${passed ? "PASS" : "FAIL"}] build_insert_query`);
        output_lines.push(`  Generated query length: ${query.length} chars`);
        output_lines.push(`  Has entity statements: ${hasEntities}`);
        output_lines.push(`  Has relation statements: ${hasRelations}`);
        output_lines.push(`  Preview: ${query.substring(0, 100)}...`);
        output_lines.push("");
    } catch (e: any) {
        results.push({ name: "build_insert_query", passed: false, output: null, error: e.message });
        output_lines.push(`[FAIL] build_insert_query - Error: ${e.message}`);
        output_lines.push("");
    }

    // Test 5: check_existing_entities (requires DB)
    output_lines.push("-".repeat(60));
    output_lines.push("DATABASE TESTS (require auth + DB connection)");
    output_lines.push("-".repeat(60));
    output_lines.push("");

    try {
        const existingIds = await graph_utils.check_existing_entities(["nonexistent_test_id_12345"]);
        const passed = existingIds.size === 0;

        results.push({ name: "check_existing_entities", passed, output: existingIds.size });
        output_lines.push(`[${passed ? "PASS" : "FAIL"}] check_existing_entities`);
        output_lines.push(`  Query for nonexistent ID returned: ${existingIds.size} results (expected 0)`);
        output_lines.push("");
    } catch (e: any) {
        results.push({ name: "check_existing_entities", passed: false, output: null, error: e.message });
        output_lines.push(`[FAIL] check_existing_entities - Error: ${e.message}`);
        output_lines.push("");
    }

    // Test 6: Full store_knowledge flow
    try {
        const test_triples: graph_utils.Triple[] = [
            ["test_graph_utils", "is_a", "test_suite"],
            ["test_graph_utils", "created_by", "claude"],
        ];

        output_lines.push(`[....] store_knowledge - Running...`);
        const storeResult = await graph_utils.store_knowledge(test_triples);

        const passed = storeResult.entities !== undefined && storeResult.relations !== undefined;

        results.push({ name: "store_knowledge", passed, output: storeResult });
        output_lines.push(`[${passed ? "PASS" : "FAIL"}] store_knowledge`);
        output_lines.push(`  Entities - new: ${storeResult.entities.new}, existing: ${storeResult.entities.existing}`);
        output_lines.push(`  Relations - new: ${storeResult.relations.new}, existing: ${storeResult.relations.existing}`);
        output_lines.push("");
    } catch (e: any) {
        results.push({ name: "store_knowledge", passed: false, output: null, error: e.message });
        output_lines.push(`[FAIL] store_knowledge - Error: ${e.message}`);
        output_lines.push("");
    }

    // Test 7: search_knowledge
    try {
        output_lines.push(`[....] search_knowledge - Running...`);
        const searchResult = await graph_utils.search_knowledge("test graph utils", { limit: 5 });

        const passed = searchResult.query !== undefined && Array.isArray(searchResult.entities);

        results.push({ name: "search_knowledge", passed, output: searchResult });
        output_lines.push(`[${passed ? "PASS" : "FAIL"}] search_knowledge`);
        output_lines.push(`  Query: "${searchResult.query}"`);
        output_lines.push(`  Found ${searchResult.entities.length} entities, ${searchResult.relations.length} relations`);
        output_lines.push("");

        // Show formatted results
        const formatted = graph_utils.format_search_results(searchResult);
        output_lines.push("  Formatted output:");
        formatted.split('\n').forEach(line => output_lines.push(`    ${line}`));
        output_lines.push("");
    } catch (e: any) {
        results.push({ name: "search_knowledge", passed: false, output: null, error: e.message });
        output_lines.push(`[FAIL] search_knowledge - Error: ${e.message}`);
        output_lines.push("");
    }

    // Summary
    output_lines.push("=".repeat(60));
    output_lines.push("SUMMARY");
    output_lines.push("=".repeat(60));

    const passed_count = results.filter(r => r.passed).length;
    const failed_count = results.filter(r => !r.passed).length;

    output_lines.push(`Total: ${results.length} tests`);
    output_lines.push(`Passed: ${passed_count}`);
    output_lines.push(`Failed: ${failed_count}`);
    output_lines.push("");

    if (failed_count > 0) {
        output_lines.push("Failed tests:");
        results.filter(r => !r.passed).forEach(r => {
            output_lines.push(`  - ${r.name}: ${r.error || "assertion failed"}`);
        });
    }

    output_lines.push("");
    output_lines.push("=".repeat(60));

    return output_lines.join('\n');
}

// Export for browser console
export async function test_graph_utils(): Promise<string> {
    console.log("Running graph_utils tests...");
    const output = await run_tests();
    console.log(output);
    return output;
}

/**
 * Clear test data created by test_graph_utils
 */
export async function clear_graph_utils_test(): Promise<string> {
    console.log("Clearing graph_utils test data...");

    const output_lines: string[] = [];
    output_lines.push("Clearing graph_utils test data...");
    output_lines.push("");

    // Test entity IDs created by the test suite
    const test_entity_ids = [
        "test_graph_utils",
        "test_suite",
        "claude"
    ];

    // Test relation IDs
    const test_relation_ids = [
        "test_graph_utils_is_a_test_suite",
        "test_graph_utils_created_by_claude"
    ];

    try {
        // Delete test entities
        const deleteEntitiesQuery = test_entity_ids
            .map(id => `DELETE type::thing("user_entities", "${id}")`)
            .join(';\n') + ';';

        await fbu.surreal_query({ query: deleteEntitiesQuery });
        output_lines.push(`Deleted ${test_entity_ids.length} test entities`);
        test_entity_ids.forEach(id => output_lines.push(`  - ${id}`));
        output_lines.push("");

        // Delete test relations
        const deleteRelationsQuery = test_relation_ids
            .map(id => `DELETE user_relations WHERE id = "${id}"`)
            .join(';\n') + ';';

        await fbu.surreal_query({ query: deleteRelationsQuery });
        output_lines.push(`Deleted ${test_relation_ids.length} test relations`);
        test_relation_ids.forEach(id => output_lines.push(`  - ${id}`));
        output_lines.push("");

        output_lines.push("Done!");
    } catch (e: any) {
        output_lines.push(`Error: ${e.message}`);
    }

    const output = output_lines.join('\n');
    console.log(output);
    return output;
}
