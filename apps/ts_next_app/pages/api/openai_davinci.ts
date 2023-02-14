// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import * as tsn from "tidyscripts_node"
const { send_message } = tsn.apis.openai ;
const { get_logger   } = tsn.common.logger ; 

const log = get_logger({id : "openai_api"}) ; 

declare var URL : any ; 

type Data = {
  text: any , 
}


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {

  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  // another common pattern
  // res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  var params = req.query ; 
  var {max_tokens,prompt} = params ; 

  var text : any ;
  var response : any ; 

  response = await send_message(prompt as string, Number(max_tokens) ) ;    
  text = response.data.choices[0].text;
  res.status(200).json({text})     

}
