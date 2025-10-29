// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';

type Data = any;

export const config = {
    maxDuration: 30,
};

/**
 * Generates an ephemeral key for OpenAI Realtime API
 * This key is used to establish WebRTC connections from the browser
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<Data>
) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

        if (!OPENAI_API_KEY) {
            console.error('OPENAI_API_KEY not found in environment');
            throw new Error('OPENAI_API_KEY not configured in environment variables');
        }

        console.log('Calling OpenAI Realtime API to generate ephemeral token...');

        // Call OpenAI Realtime API to generate ephemeral token
        const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                session: {
                    type: 'realtime',
                    model: 'gpt-realtime',
                },
            }),
        });

        const responseText = await response.text();
        console.log('OpenAI API response status:', response.status);
        console.log('OpenAI API response body:', responseText);

        if (!response.ok) {
            console.error('OpenAI API error response:', responseText);
            throw new Error(`OpenAI API error: ${response.status} - ${responseText}`);
        }

        const data = JSON.parse(responseText);
        console.log('Generated ephemeral token successfully. Response structure:', Object.keys(data));

        res.status(200).json(data);
    } catch (error: any) {
        console.error('Error generating ephemeral token:', error);
        res.status(500).json({
            error: 'Failed to generate ephemeral token',
            message: error.message
        });
    }
}
