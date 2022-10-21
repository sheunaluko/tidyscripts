// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'

import payload from "../../../public/resources/radiopaedia_cases.json"

type Data = any ;

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  res.setHeader('Cache-Control', 's-maxage=86400');
  res.status(200).json(payload);
}

