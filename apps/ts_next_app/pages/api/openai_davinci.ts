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

  let url = `https://tidyscripts.com/${req.url}`
  console.log(url)
  //console.log(tsn.common.R.keys(req.url) ) ; 
  const params = new URL(url).searchParams;
  console.log(params) 
  const max_tokens  = Number(params.get("max_tokens"));
  const prompt = params.get("prompt");

  var text : any ;
  var response : any ; 
  try {
    log(`Using ${max_tokens} tokens for prompt: ${prompt}`)
    response = await send_message(prompt, max_tokens ) ;    
    text = response.data.choices[0].text;
    log(`Got text: ${text}`) ; 
  } catch (e : any)  {
    text = "API Error" ;
    log(`API error!`)
  }

  res.status(200).json({text}) 
}
