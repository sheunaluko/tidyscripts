// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import * as tsn from "tidyscripts_node"
const { get_logger   } = tsn.common.logger ; 
import {OpenAI} from "openai" ; 

declare var URL : any ; 
type Data = any ;

const USER = process.env.SURREAL_DB_USER
const PW = process.env.SURREAL_DB_PW
const URL = process.env.SURREAL_DB_URL

const log = get_logger({id : "tes"})


interface CallData {
    fn_path : string[]   // path to the function that should be called (starts with node or web)
    fn_args : any[]      // array of arguments to pass to the function 
} 


/**
 * This is a vercel serverless function 
 * 
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<Data>
) {



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

    const { fn_path, fn_args } = req.body;

    if (!fn_path || !fn_args) {
	return res.status(400).json({ message: 'fn_path and fn_args are required' });
    }

    log(`Got post request for tes call`) ;
    console.log(req.body) 
    const response = await tsn.tes.handle_tes_call({fn_path, fn_args})  ; 
    res.status(200).json(response) 



}
