'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Box, Container, Typography, Chip, Stack, IconButton, Skeleton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import 'highlight.js/styles/github-dark.css';

interface Post {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  tags: string[];
  content: string;
}

export default function BlogPost() {
  const params = useParams();
  const slug = params?.slug as string;
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    fetch(`/api/blog/${slug}`)
      .then(res => {
        if (!res.ok) throw new Error('Post not found');
        return res.json();
      })
      .then(data => {
        setPost(data.post);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#0a0a0a', color: '#fafafa', width: '100%' }}>
        <Container maxWidth="md" sx={{ py: 4, width: '100%' }}>
          <Skeleton variant="circular" width={40} height={40} sx={{ bgcolor: '#222', mb: 4 }} />
          <Skeleton variant="text" width={180} height={20} sx={{ bgcolor: '#222', mb: 1 }} />
          <Skeleton variant="text" width="80%" height={48} sx={{ bgcolor: '#222', mb: 2 }} />
          <Stack direction="row" spacing={1} sx={{ mb: 6 }}>
            <Skeleton variant="rounded" width={60} height={24} sx={{ bgcolor: '#222' }} />
            <Skeleton variant="rounded" width={80} height={24} sx={{ bgcolor: '#222' }} />
            <Skeleton variant="rounded" width={70} height={24} sx={{ bgcolor: '#222' }} />
          </Stack>
          <Skeleton variant="text" width="100%" height={24} sx={{ bgcolor: '#222' }} />
          <Skeleton variant="text" width="100%" height={24} sx={{ bgcolor: '#222' }} />
          <Skeleton variant="text" width="90%" height={24} sx={{ bgcolor: '#222', mb: 3 }} />
          <Skeleton variant="rounded" width="100%" height={120} sx={{ bgcolor: '#222', mb: 3 }} />
          <Skeleton variant="text" width="100%" height={24} sx={{ bgcolor: '#222' }} />
          <Skeleton variant="text" width="95%" height={24} sx={{ bgcolor: '#222' }} />
          <Skeleton variant="text" width="85%" height={24} sx={{ bgcolor: '#222' }} />
        </Container>
      </Box>
    );
  }

  if (error || !post) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#0a0a0a', color: '#fafafa', py: 8, width: '100%' }}>
        <Container maxWidth="md" sx={{ width: '100%' }}>
          <Typography variant="h4" sx={{ mb: 2 }}>Post not found</Typography>
          <Link href="/blog" style={{ color: '#8888ff' }}>
            Back to blog
          </Link>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0a0a0a', color: '#fafafa', width: '100%' }}>
      <Container maxWidth="md" sx={{ py: 4, width: '100%' }}>
        {/* Back button */}
        <Link href="/blog" style={{ textDecoration: 'none' }}>
          <IconButton sx={{ color: '#888', mb: 4, '&:hover': { color: '#fafafa' } }}>
            <ArrowBackIcon />
          </IconButton>
        </Link>

        {/* Header */}
        <Box sx={{ mb: 6 }}>
          <Typography variant="overline" sx={{ color: '#666' }}>
            {new Date(post.date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
            {' · '}
            {post.author}
          </Typography>
          <Typography variant="h3" component="h1" sx={{ mt: 1, mb: 3, fontWeight: 700 }}>
            {post.title}
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
        </Box>

        {/* Content */}
        <Box
          sx={{
            '& h1, & h2, & h3, & h4, & h5, & h6': {
              color: '#fafafa',
              mt: 4,
              mb: 2,
              fontWeight: 600,
            },
            '& h2': { fontSize: '1.75rem', borderBottom: '1px solid #222', pb: 1 },
            '& h3': { fontSize: '1.4rem' },
            '& p': { color: '#ccc', lineHeight: 1.8, mb: 2 },
            '& a': { color: '#8888ff', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } },
            '& ul, & ol': { color: '#ccc', pl: 3, mb: 2 },
            '& li': { mb: 1 },
            '& code': {
              fontFamily: 'monospace',
              fontSize: '0.9em',
            },
            '& :not(pre) > code': {
              bgcolor: '#1a1a2e',
              color: '#e8e8ff',
              px: 0.75,
              py: 0.25,
              borderRadius: 0.5,
            },
            '& pre': {
              bgcolor: '#111 !important',
              border: '1px solid #222',
              borderRadius: 1,
              p: 2,
              overflow: 'auto',
              mb: 3,
              '& code': {
                bgcolor: 'transparent',
                p: 0,
              },
            },
            '& blockquote': {
              borderLeft: '3px solid #444',
              pl: 2,
              ml: 0,
              color: '#888',
              fontStyle: 'italic',
            },
            '& table': {
              width: '100%',
              borderCollapse: 'collapse',
              mb: 3,
            },
            '& th, & td': {
              border: '1px solid #333',
              p: 1.5,
              textAlign: 'left',
            },
            '& th': {
              bgcolor: '#1a1a1a',
              color: '#fafafa',
            },
            '& td': {
              color: '#ccc',
            },
            '& hr': {
              border: 'none',
              borderTop: '1px solid #333',
              my: 4,
            },
            '& strong': {
              color: '#fafafa',
            },
          }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
            {post.content}
          </ReactMarkdown>
        </Box>

        {/* Footer */}
        <Box sx={{ mt: 8, pt: 4, borderTop: '1px solid #222' }}>
          <Link href="/blog" style={{ color: '#8888ff', textDecoration: 'none' }}>
            ← Back to all posts
          </Link>
        </Box>
      </Container>
    </Box>
  );
}
