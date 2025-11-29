// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import * as tsn from "tidyscripts_node"
const { get_logger } = tsn.common.logger;
import { OpenAI } from "openai";

type Data = any;

const log = get_logger({ id: "oai_embedding" });

export const config = {
    maxDuration: 300, // can run for 300s
};

/**
 * This is a vercel serverless function for generating text embeddings
 *
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<Data>
) {
    const client = new OpenAI(); // default for v4 is to use the env var for API key

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

    const { text, dimensions } = req.body;

    if (!text) {
        return res.status(400).json({ message: 'Text is required' });
    }

    try {
        log(`Got post request for embedding generation`);
        console.log({ text: text.substring(0, 100), dimensions });

        const response = await client.embeddings.create({
            input: text,
            model: 'text-embedding-3-small',
            ...(dimensions && { dimensions })
        });

        const embedding = response.data[0].embedding;

        log(`Generated embedding with ${embedding.length} dimensions`);
        res.status(200).json({
            embedding,
            model: 'text-embedding-3-small',
            dimensions: embedding.length
        });

    } catch (error) {
        log(`Error generating embedding: ${error}`);
        console.error('Error generating embedding:', error);
        res.status(500).json({
            message: 'Error generating embedding',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
