// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import * as tsn from "tidyscripts_node"


type Data = any ;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const { case_id } = req.query; 
  res.setHeader('Cache-Control', 's-maxage=86400');
  res.status(200).json(await tsn.apis.radiopaedia.download_case_data(case_id as string)); 
}

