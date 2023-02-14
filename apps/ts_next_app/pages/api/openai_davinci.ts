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

  var params = req.query ; 
  var {max_tokens,prompt} = params ; 

  var text : any ;
  var response : any ; 

  response = await send_message(prompt as string, Number(max_tokens) ) ;    
  text = response.data.choices[0].text;
  res.status(200).json({text})     

}
