// Next.js API route for OpenAI Responses API (simple text output)
import type { NextApiRequest, NextApiResponse } from 'next'
import * as tsn from "tidyscripts_node"
const { get_logger } = tsn.common.logger;
import OpenAI from "openai";

type Data = any;

const log = get_logger({ id: "oai_resp" })

export const config = {
    maxDuration: 300,
};

/**
 * Simple OpenAI Responses API endpoint
 *
 * Supports two request formats for backward compatibility:
 *
 * Format 1 (current):
 * {
 *   model: string,
 *   instructions: string,  // System prompt
 *   input: string          // User message
 * }
 *
 * Format 2 (new - messages array):
 * {
 *   model: string,
 *   input: Array<{ role: string, content: string }>  // Messages array
 * }
 *
 * Note: OpenAI Responses API doesn't support max_tokens or temperature parameters
 *
 * Returns:
 * {
 *   output_text: string    // Direct text response
 * }
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<Data>
) {
    const client = new OpenAI();

    // CORS headers
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

    const { model, instructions, input, max_tokens, temperature } = req.body;

    if (!model || !input) {
        return res.status(400).json({
            message: 'model and input are required'
        });
    }

    log(`Got POST request for simple response`);
    console.log(req.body);

    // Determine format and extract instructions/input
    let finalInstructions: string;
    let finalInput: string;

    if (Array.isArray(input)) {
        // New format: messages array
        const systemMsg = input.find((m: any) => m.role === 'system');
        const userMsgs = input.filter((m: any) => m.role !== 'system');
        finalInstructions = systemMsg?.content || '';
        finalInput = userMsgs.map((m: any) => m.content).join('\n');
        log('Using messages array format');
    } else {
        // Current format: instructions + input string
        if (!instructions) {
            return res.status(400).json({
                message: 'instructions is required when input is a string'
            });
        }
        finalInstructions = instructions;
        finalInput = input;
        log('Using legacy format (instructions + input)');
    }

    try {
        // Note: OpenAI Responses API doesn't support max_tokens or temperature
        // It uses a simpler interface with just model, instructions, and input
        const response = await client.responses.create({
            model,
            instructions: finalInstructions,
            input: finalInput,
        });

        log(`Got response:`);
        console.log(response);

        // Return the full response object (includes output_text)
        res.status(200).json(response);

    } catch (error: any) {
        log(`Error occurred: ${error.message}`);
        console.log(error);
        res.status(500).json({
            error: error.message,
            details: error
        });
    }
}
