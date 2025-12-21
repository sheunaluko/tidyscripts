import type { NextApiRequest, NextApiResponse } from 'next';
import { getPostBySlug } from '../../../app/blog/lib/posts';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { slug } = req.query;

  if (typeof slug !== 'string') {
    return res.status(400).json({ error: 'Invalid slug' });
  }

  try {
    const post = getPostBySlug(slug);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.status(200).json({ post });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch post' });
  }
}
