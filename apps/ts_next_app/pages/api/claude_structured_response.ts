// Next.js API route for Anthropic Claude API with structured output
import type { NextApiRequest, NextApiResponse } from 'next'
import * as tsn from "tidyscripts_node"
const { get_logger } = tsn.common.logger;
import Anthropic from "@anthropic-ai/sdk";

type Data = any;

const log = get_logger({ id: "claude_struct_resp" })

export const config = {
    maxDuration: 300,
};

/**
 * Transform schema for Claude compatibility
 * Claude requires additionalProperties: false on all objects
 * This recursively walks the schema and enforces that constraint
 */
function transformSchemaForClaude(schema: any): any {
    if (!schema || typeof schema !== 'object') {
        return schema;
    }

    // Handle arrays
    if (Array.isArray(schema)) {
        return schema.map(transformSchemaForClaude);
    }

    const result: any = {};

    for (const key of Object.keys(schema)) {
        if (key === 'additionalProperties') {
            // Force additionalProperties to false for Claude
            result[key] = false;
        } else {
            result[key] = transformSchemaForClaude(schema[key]);
        }
    }

    // If this is an object type without additionalProperties, add it
    if (result.type === 'object' && !('additionalProperties' in result)) {
        result.additionalProperties = false;
    }

    return result;
}

/**
 * Claude structured response endpoint using Anthropic's structured outputs beta
 *
 * Expected request body:
 * {
 *   model: string,              // e.g., "claude-sonnet-4-5"
 *   input: Array<{ role: string, content: string }>,
 *   schema: object,             // JSON schema
 *   schema_name: string,        // Name for the schema (for logging)
 *   max_tokens?: number         // Optional, defaults to 4096
 * }
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<Data>
) {
    const client = new Anthropic();

    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST')
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    )

    if (req.method === 'OPTIONS') {
        res.status(200).end()
        return
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { model, input, schema, schema_name, max_tokens = 4096 } = req.body;

    if (!model || !input || !schema || !schema_name) {
        return res.status(400).json({
            message: 'model, input, schema, and schema_name are required'
        });
    }

    log(`Got post request for structured response: ${schema_name}`);
    console.log(req.body);

    // Extract all system messages and concatenate their content
    // Claude requires system as a top-level parameter, not in messages array
    const systemMessages = input.filter((m: any) => m.role === 'system');
    const systemContent = systemMessages.length > 0
        ? systemMessages.map((m: any) => m.content).join('\n\n')
        : undefined;

    // Filter out system messages for the messages array
    const nonSystemMessages = input.filter((m: any) => m.role !== 'system');

    log(`System messages found: ${systemMessages.length}`);
    log(`Non-system messages: ${nonSystemMessages.length}`);

    // Transform schema for Claude compatibility
    const claudeSchema = transformSchemaForClaude(schema);
    log(`Schema transformed for Claude compatibility`);

    try {
        const response = await client.beta.messages.create({
            model,
            max_tokens,
            betas: ["structured-outputs-2025-11-13"],
            ...(systemContent && { system: systemContent }),
            messages: nonSystemMessages,
            output_format: {
                type: "json_schema",
                schema: claudeSchema
            }
        });

        log(`Got response:`);
        console.log(response);

        // Add output_text field for consistency with OpenAI endpoint
        const enhancedResponse = {
            ...response,
            output_text: response.content[0]?.type === 'text'
                ? response.content[0].text
                : null
        };

        res.status(200).json(enhancedResponse);

    } catch (error: any) {
        log(`Error occurred: ${error.message}`);
        console.log(error);
        res.status(500).json({
            error: error.message,
            details: error
        });
    }
}
