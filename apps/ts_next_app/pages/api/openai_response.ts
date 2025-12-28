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
 * Expected request body:
 * {
 *   model: string,
 *   instructions: string,  // System prompt
 *   input: string          // User message
 * }
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

    const { model, instructions, input } = req.body;

    if (!model || !instructions || !input) {
        return res.status(400).json({
            message: 'model, instructions, and input are required'
        });
    }

    log(`Got POST request for simple response`);
    console.log(req.body);

    try {
        const response = await client.responses.create({
            model,
            instructions,
            input,
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
