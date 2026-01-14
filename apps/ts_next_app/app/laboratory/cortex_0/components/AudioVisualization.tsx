'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { Box } from '@mui/material';

interface AudioVisualizationProps {
  audioLevel: number;
  paused?: boolean;
  width?: number;
  height?: number;
  backgroundColor?: string;
  particleColor?: string;
  particleCount?: number;
}

const AudioVisualization: React.FC<AudioVisualizationProps> = ({
  audioLevel,
  paused = false,
  width = 300,
  height = 100,
  backgroundColor = '#1A2027',
  particleColor = '#34eb49',
  particleCount = 50
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  const generateParticles = useCallback((sigma: number) => {
    const particles: Array<{x: number, y: number}> = [];

    for (let i = 0; i < particleCount; i++) {
      // Box-Muller transform for Gaussian distribution
      const u1 = Math.random();
      const u2 = Math.random();
      const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);

      particles.push({ x: z0 * sigma, y: z1 * sigma });
    }

    return particles;
  }, [particleCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || paused) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      // Clear canvas
      if (backgroundColor === 'transparent') {
        ctx.clearRect(0, 0, width, height);
      } else {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
      }

      // Generate particles based on audio level
      const sigma = audioLevel + 0.03;
      const particles = generateParticles(sigma);

      // Draw particles
      ctx.fillStyle = particleColor;
      particles.forEach(p => {
        // Normalize from [-1, 1] to canvas coordinates
        const x = (p.x + 1) * width / 2;
        const y = (p.y + 1) * height / 2;

        // Only draw particles within canvas bounds
        if (x >= 0 && x <= width && y >= 0 && y <= height) {
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, 2 * Math.PI);
          ctx.fill();
        }
      });

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audioLevel, paused, width, height, backgroundColor, particleColor, generateParticles]);

  return (
    <Box display="flex" justifyContent="center" width="100%">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ backgroundColor }}
      />
    </Box>
  );
};

export default AudioVisualization;
