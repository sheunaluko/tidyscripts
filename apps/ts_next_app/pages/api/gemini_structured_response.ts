// Next.js API route for Google Gemini with structured output (OpenAI compatibility mode)
import type { NextApiRequest, NextApiResponse } from 'next'
import * as tsn from "tidyscripts_node"
const { get_logger } = tsn.common.logger;
import OpenAI from "openai";

type Data = any;

const log = get_logger({ id: "gemini_struct_resp" })

export const config = {
    maxDuration: 300,
};

/**
 * Gemini structured response endpoint using OpenAI SDK compatibility
 *
 * Expected request body:
 * {
 *   model: string,              // e.g., "gemini-2.0-flash"
 *   input: Array<{ role: string, content: string }>,
 *   schema: object,             // JSON schema
 *   schema_name: string         // Name for the schema
 * }
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<Data>
) {
    // OpenAI SDK configured for Gemini
    const client = new OpenAI({
        apiKey: process.env.GEMINI_API_KEY,
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai"
    });

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

    const { model, input, schema, schema_name } = req.body;

    if (!model || !input || !schema || !schema_name) {
        return res.status(400).json({
            message: 'model, input, schema, and schema_name are required'
        });
    }

    log(`Got post request for structured response: ${schema_name}`);
    log(`Model: ${model}`);
    console.log(req.body);

    try {
        const response = await client.beta.chat.completions.parse({
            model,
            messages: input,
            response_format: {
                type: "json_schema",
                json_schema: {
                    name: schema_name,
                    schema,
                    strict: true
                }
            }
        });

        log(`Got response:`);
        console.log(response);

        // Normalize response with output_text for consistency with other endpoints
        const parsed = response.choices[0]?.message?.parsed;
        const enhancedResponse = {
            ...response,
            output_text: parsed ? JSON.stringify(parsed) : null
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
