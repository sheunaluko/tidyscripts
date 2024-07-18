// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import * as tsn from "tidyscripts_node"
const { chat_completion } = tsn.apis.openai ;
const { get_logger   } = tsn.common.logger ; 

const log = get_logger({id : "openai_chat"}) ; 

declare var URL : any ; 

type Data = any ; 


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
    // another common pattern
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

    const { body } = req;
    log(`Got post request for chat completion api`) ; 

    var {max_tokens,model,messages} = body 

    let {response,t_elapsed}  = await chat_completion(messages, model,max_tokens)  ; 
    log(`Got response: ${response}`); 
    res.status(200).json({response,t_elapsed})     

}
