import type { NextApiRequest, NextApiResponse } from 'next';
import { getAllPosts } from '../../../app/blog/lib/posts';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const posts = getAllPosts();
    res.status(200).json({ posts });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
}
