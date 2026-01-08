// Next.js API route for Anthropic Claude API (unstructured, plain text output)
import type { NextApiRequest, NextApiResponse } from 'next'
import * as tsn from "tidyscripts_node"
const { get_logger } = tsn.common.logger;
import Anthropic from "@anthropic-ai/sdk";

type Data = any;

const log = get_logger({ id: "claude_resp" })

export const config = {
    maxDuration: 300,
};

/**
 * Claude unstructured response endpoint
 *
 * Expected request body:
 * {
 *   model: string,              // e.g., "claude-sonnet-4-5"
 *   input: Array<{ role: string, content: string }>,  // Messages array
 *   max_tokens?: number,        // Optional, defaults to 4096
 *   temperature?: number        // Optional
 * }
 *
 * Returns:
 * {
 *   output_text: string,        // Plain text response
 *   usage: { input_tokens, output_tokens },
 *   model: string,
 *   finish_reason: string
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

    const { model, input, max_tokens = 4096, temperature } = req.body;

    if (!model || !input) {
        return res.status(400).json({
            message: 'model and input are required'
        });
    }

    log(`Got POST request for unstructured response`);
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

    try {
        // Use standard messages.create (not beta structured outputs)
        const response = await client.messages.create({
            model,
            max_tokens,
            ...(temperature && { temperature }),
            ...(systemContent && { system: systemContent }),
            messages: nonSystemMessages,
        });

        log(`Got response:`);
        console.log(response);

        // Normalize response format
        const normalized = {
            output_text: response.content[0]?.type === 'text'
                ? response.content[0].text
                : '',
            usage: {
                input_tokens: response.usage.input_tokens,
                output_tokens: response.usage.output_tokens,
            },
            model: response.model,
            finish_reason: response.stop_reason,
            // Include original response for debugging
            _original: response,
        };

        res.status(200).json(normalized);

    } catch (error: any) {
        log(`Error occurred: ${error.message}`);
        console.log(error);
        res.status(500).json({
            error: error.message,
            details: error
        });
    }
}
