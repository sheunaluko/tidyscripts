'use client';

import React, { useEffect } from 'react';
import { Box } from '@mui/material';
import { motion } from 'framer-motion';
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
      component={motion.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box
        component={motion.div}
        animate={{ rotate: 360 }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'linear',
        }}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Image
          src="/tidyscripts_logo.png"
          alt="Loading..."
          width={120}
          height={120}
          style={{ borderRadius: '50%' }}
        />
      </Box>
    </Box>
  );
};

export default IndexLoadingLogo;
