// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import * as tsn from "tidyscripts_node"
const { get_logger   } = tsn.common.logger ; 
import {OpenAI} from "openai" ; 

declare var URL : any ; 
type Data = any ;


const ORG = process.env.OPENAI_ORG
const API_KEY = process.env.OPENAI_API_KEY


const log = get_logger({id : "oai_struct_compl"})


export const config = {
    maxDuration: 300, //can run for 300s
};

/**
 * This is a vercel serverless function 
 * 
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<Data>
) {


    const client = new OpenAI(); //default for v4 is to use the env var for API key    

    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Origin', '*')
    // res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
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

    const { model, messages } = req.body;

    if (!model || !messages) {
	return res.status(400).json({ message: 'Model and messages are required' });
    }

    log(`Got post request for struct chat completion `) ;
    console.log(req.body)

    try {
        const response = await client.beta.chat.completions.parse(req.body) ;
        log(`Got response:`) ;
        console.log(response)
        res.status(200).json(response)
    } catch (error: any) {
        log(`Parse error occurred: ${error.message}`);
        // Try to get raw response for debugging
        try {
            const rawResponse = await client.chat.completions.create(req.body);
            log(`Raw response for debugging:`);
            console.log(JSON.stringify(rawResponse, null, 2));
            console.log("Raw content:", rawResponse.choices[0]?.message?.content);
        } catch (rawError: any) {
            log(`Could not fetch raw response: ${rawError.message}`);
        }
        throw error;
    } 



}
