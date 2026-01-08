// Next.js API route for Google Gemini (unstructured, plain text output)
import type { NextApiRequest, NextApiResponse } from 'next'
import * as tsn from "tidyscripts_node"
const { get_logger } = tsn.common.logger;
import { GoogleGenAI } from '@google/genai';

type Data = any;

const log = get_logger({ id: "gemini_resp" })

export const config = {
    maxDuration: 300,
};

/**
 * Gemini unstructured response endpoint using native Gemini API
 *
 * Expected request body:
 * {
 *   model: string,              // e.g., "gemini-2.0-flash"
 *   input: Array<{ role: string, content: string }>,  // Messages array
 *   max_tokens?: number,        // Optional (maps to maxOutputTokens)
 *   temperature?: number        // Optional
 * }
 *
 * Returns:
 * {
 *   output_text: string,        // Plain text response
 *   usage: { input_tokens, output_tokens, total_tokens },
 *   model: string,
 *   finish_reason: string
 * }
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<Data>
) {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

    const { model, input, max_tokens, temperature } = req.body;

    if (!model || !input) {
        return res.status(400).json({
            message: 'model and input are required'
        });
    }

    log(`Got POST request for unstructured response`);
    log(`Model: ${model}`);
    console.log(req.body);

    try {
        // Extract system message (Gemini uses systemInstruction parameter)
        const systemMessage = input.find((m: any) => m.role === 'system');
        const nonSystemMessages = input.filter((m: any) => m.role !== 'system');

        // Convert messages to Gemini format
        // Gemini expects: { role: 'user' | 'model', parts: [{ text: string }] }
        const contents = nonSystemMessages.map((msg: any) => ({
            role: msg.role === 'assistant' ? 'model' : msg.role,
            parts: [{ text: msg.content }]
        }));

        // Build generation config
        const generationConfig: any = {};
        if (max_tokens) generationConfig.maxOutputTokens = max_tokens;
        if (temperature !== undefined) generationConfig.temperature = temperature;

        const requestConfig: any = {
            model,
            contents,
        };

        if (systemMessage) {
            requestConfig.systemInstruction = systemMessage.content;
        }

        if (Object.keys(generationConfig).length > 0) {
            requestConfig.generationConfig = generationConfig;
        }

        log('Gemini request config:');
        console.log(JSON.stringify(requestConfig, null, 2));

        const response = await ai.models.generateContent(requestConfig);

        log(`Got response:`);
        console.log(response);

        // Extract text from response
        const outputText = response.text || '';

        // Normalize response format
        const normalized = {
            output_text: outputText,
            usage: response.usageMetadata ? {
                input_tokens: response.usageMetadata.promptTokenCount,
                output_tokens: response.usageMetadata.candidatesTokenCount,
                total_tokens: response.usageMetadata.totalTokenCount,
            } : undefined,
            model: model,
            finish_reason: response.candidates?.[0]?.finishReason || 'stop',
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
