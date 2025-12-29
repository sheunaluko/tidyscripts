'use client';

import React, { useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import Image from 'next/image';

interface IndexLoadingLogoProps {
  show: boolean;
  onLoadComplete?: () => void;
}

export const IndexLoadingLogo: React.FC<IndexLoadingLogoProps> = ({
  show,
  onLoadComplete
}) => {
  useEffect(() => {
    if (show && onLoadComplete) {
      const timer = setTimeout(() => {
        onLoadComplete();
      }, 1500); // Display for 1.5 seconds
      return () => clearTimeout(timer);
    }
  }, [show, onLoadComplete]);

  if (!show) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          '@keyframes spin': {
            from: { transform: 'rotate(0deg)' },
            to: { transform: 'rotate(360deg)' },
          },
          animation: 'spin 4s linear infinite',
        }}
      >
        <Image
          src="/tidyscripts_logo.png"
          alt="Loading..."
          width={80}
          height={80}
          style={{ borderRadius: '50%' }}
        />
      </Box>
      <Typography
        variant="h6"
        sx={{
          '@keyframes ellipsis': {
            '0%': { content: '"Loading"' },
            '25%': { content: '"Loading."' },
            '50%': { content: '"Loading.."' },
            '75%': { content: '"Loading..."' },
          },
          '&::after': {
            content: '"Loading..."',
            animation: 'ellipsis 1.5s steps(4, end) infinite',
          },
        }}
      />
    </Box>
  );
};

export default IndexLoadingLogo;
