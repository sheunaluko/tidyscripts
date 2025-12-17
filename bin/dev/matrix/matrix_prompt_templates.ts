/**
 * Prompt templates for Matrix entity/relation extraction
 * Uses structured completion pattern from cortex.ts
 */

import { z } from "zod";

// =============================================================================
// Zod Schemas for Structured Output
// =============================================================================

/**
 * Schema for extracted entities
 */
export const ExtractedEntitySchema = z.object({
    name: z.string().describe("The name/identifier of the entity"),
});

export const EntityExtractionResponseSchema = z.object({
    entities: z.array(ExtractedEntitySchema),
});

export type ExtractedEntity = z.infer<typeof ExtractedEntitySchema>;

/**
 * Schema for extracted relations
 */
export const ExtractedRelationSchema = z.object({
    name: z.string().describe("The name of the relationship"),
    source: z.string().describe("The source entity name"),
    target: z.string().describe("The target entity name"),
});

export const RelationExtractionResponseSchema = z.object({
    relations: z.array(ExtractedRelationSchema),
});

export type ExtractedRelation = z.infer<typeof ExtractedRelationSchema>;

// =============================================================================
// Prompt Templates
// =============================================================================

/**
 * System prompt for entity extraction
 */
export const ENTITY_EXTRACTION_SYSTEM_PROMPT = `You are an intelligent knowledge extraction system. Your task is to identify and extract all meaningful entities from the provided text.

An entity is any distinct concept, object, person, place, organization, event, or idea that can be uniquely identified.

Guidelines:
1. Extract entities that are meaningful and could have relationships with other entities
2. Use clear, concise names for entities (use the most common/recognizable form)
3. Extract entities in their natural form as they appear in the text 

Return all entities found in the text.`;

/**
 * Build user prompt for entity extraction
 */
export function build_entity_extraction_prompt(text: string): string {
    return `Extract all entities from the following text:

TEXT:
${text}

Extract all meaningful entities with their names.`;
}

/**
 * System prompt for relation extraction
 */
export const RELATION_EXTRACTION_SYSTEM_PROMPT = `You are an intelligent knowledge extraction system. Your task is to identify relationships between the provided entities based on the text.

A relation connects two entities and describes how they are related.

Guidelines:
1. Only create relations between entities that are explicitly mentioned in the text
2. Use concise, descriptive relation names (e.g., "has", "is_part_of", "causes", "treats", "located_in")
3. Ensure source and target match the provided entity names exactly
4. A relation should be directional (source -> relation -> target)
5. Normalize relation names to lowercase with underscores replacing spaces
6. Focus on meaningful, specific relationships rather than vague connections

Return all relations found between the entities.`;

/**
 * Build user prompt for relation extraction
 */
export function build_relation_extraction_prompt(
    text: string,
    entities: { name: string }[]
): string {
    const entityList = entities.map((e) => e.name).join(", ");
    return `Extract all relationships between the provided entities based on the following text:

ENTITIES:
${entityList}

TEXT:
${text}

Extract all meaningful relationships. Each relation should specify:
- name: the type of relationship
- source: the source entity name (must be from the entity list)
- target: the target entity name (must be from the entity list)`;
}

/**
 * Build messages array for entity extraction structured completion
 */
export function build_entity_extraction_messages(
    text: string
): Array<{ role: "system" | "user"; content: string }> {
    return [
        { role: "system", content: ENTITY_EXTRACTION_SYSTEM_PROMPT },
        { role: "user", content: build_entity_extraction_prompt(text) },
    ];
}

/**
 * Build messages array for relation extraction structured completion
 */
export function build_relation_extraction_messages(
    text: string,
    entities: { name: string }[]
): Array<{ role: "system" | "user"; content: string }> {
    return [
        { role: "system", content: RELATION_EXTRACTION_SYSTEM_PROMPT },
        { role: "user", content: build_relation_extraction_prompt(text, entities) },
    ];
}
