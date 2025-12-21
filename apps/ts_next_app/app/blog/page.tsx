'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Box, Container, Typography, Card, CardContent, Chip, Stack, Skeleton } from '@mui/material';

interface PostMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  tags: string[];
}

export default function BlogIndex() {
  const [posts, setPosts] = useState<PostMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/blog/posts')
      .then(res => res.json())
      .then(data => {
        setPosts(data.posts);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0a0a0a', color: '#fafafa', py: 8, width: '100%' }}>
      <Container maxWidth="md" sx={{ width: '100%' }}>
        <Typography variant="h2" component="h1" sx={{ mb: 2, fontWeight: 700 }}>
          Blog
        </Typography>
        <Typography variant="h6" sx={{ mb: 6, color: '#888' }}>
          Technical deep-dives and explorations from TidyScripts
        </Typography>

        {loading ? (
          <Stack spacing={4}>
            {[1, 2, 3].map((i) => (
              <Card key={i} sx={{ bgcolor: '#111', border: '1px solid #222' }}>
                <CardContent sx={{ p: 4 }}>
                  <Skeleton variant="text" width={120} height={16} sx={{ bgcolor: '#222', mb: 1 }} />
                  <Skeleton variant="text" width="70%" height={32} sx={{ bgcolor: '#222', mb: 2 }} />
                  <Skeleton variant="text" width="90%" height={20} sx={{ bgcolor: '#222', mb: 3 }} />
                  <Stack direction="row" spacing={1}>
                    <Skeleton variant="rounded" width={50} height={24} sx={{ bgcolor: '#222' }} />
                    <Skeleton variant="rounded" width={70} height={24} sx={{ bgcolor: '#222' }} />
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        ) : posts.length === 0 ? (
          <Typography sx={{ color: '#666' }}>No posts yet.</Typography>
        ) : (
          <Stack spacing={4}>
            {posts.map(post => (
              <Link key={post.slug} href={`/blog/${post.slug}`} style={{ textDecoration: 'none' }}>
                <Card
                  sx={{
                    bgcolor: '#111',
                    border: '1px solid #222',
                    transition: 'border-color 0.2s, transform 0.2s',
                    '&:hover': {
                      borderColor: '#444',
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <CardContent sx={{ p: 4 }}>
                    <Typography variant="overline" sx={{ color: '#666' }}>
                      {new Date(post.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </Typography>
                    <Typography variant="h5" sx={{ color: '#fafafa', mt: 1, mb: 2, fontWeight: 600 }}>
                      {post.title}
                    </Typography>
                    <Typography sx={{ color: '#aaa', mb: 3 }}>
                      {post.description}
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {post.tags.map(tag => (
                        <Chip
                          key={tag}
                          label={tag}
                          size="small"
                          sx={{
                            bgcolor: '#1a1a2e',
                            color: '#8888ff',
                            fontSize: '0.75rem',
                          }}
                        />
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </Stack>
        )}
      </Container>
    </Box>
  );
}
