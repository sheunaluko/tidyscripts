'use client';

import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  Slider,
  Switch,
  Chip,
  Button,
  FormControlLabel,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import type { EveSettings, ProjectionMethod } from './lib/types';
import { EVE_THEMES } from './lib/themes';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  settings: EveSettings;
  onUpdate: (partial: Partial<EveSettings>) => void;
  onReset: () => void;
  hasEmbeddings: boolean;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  open,
  onClose,
  settings,
  onUpdate,
  onReset,
  hasEmbeddings,
}) => {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: 300,
          background: '#0a0a12f0',
          backdropFilter: 'blur(12px)',
          color: '#ccc',
          p: 2.5,
          fontFamily: '"Share Tech Mono", "Courier New", monospace',
        },
      }}
    >
      <Typography
        sx={{
          fontSize: '0.8rem',
          letterSpacing: 2,
          color: '#00ffff',
          mb: 3,
        }}
      >
        EVE SETTINGS
      </Typography>

      {/* Theme */}
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: '0.7rem', color: '#888', mb: 1 }}>
          THEME
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {EVE_THEMES.map((t) => (
            <Chip
              key={t.id}
              label={t.name}
              size="small"
              onClick={() => onUpdate({ themeId: t.id })}
              sx={{
                color: t.primary,
                borderColor: settings.themeId === t.id ? t.primary : `${t.primary}40`,
                border: `1px solid`,
                background: settings.themeId === t.id ? `${t.primary}20` : 'transparent',
                fontFamily: 'inherit',
                fontSize: '0.7rem',
                '&:hover': { background: `${t.primary}30` },
              }}
            />
          ))}
        </Box>
      </Box>

      {/* Effects */}
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: '0.7rem', color: '#888', mb: 1 }}>
          EFFECTS
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: '0.65rem', color: '#aaa' }}>
            Glow Intensity ({settings.glowIntensity.toFixed(1)})
          </Typography>
          <Slider
            value={settings.glowIntensity}
            onChange={(_, v) => onUpdate({ glowIntensity: v as number })}
            min={0}
            max={2}
            step={0.1}
            size="small"
            sx={{ color: '#00ffff' }}
          />
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: '0.65rem', color: '#aaa' }}>
            Point Size ({settings.pointSize})
          </Typography>
          <Slider
            value={settings.pointSize}
            onChange={(_, v) => onUpdate({ pointSize: v as number })}
            min={1}
            max={10}
            step={0.5}
            size="small"
            sx={{ color: '#00ffff' }}
          />
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: '0.65rem', color: '#aaa' }}>
            Animation Speed ({settings.animationSpeed.toFixed(1)})
          </Typography>
          <Slider
            value={settings.animationSpeed}
            onChange={(_, v) => onUpdate({ animationSpeed: v as number })}
            min={0}
            max={2}
            step={0.1}
            size="small"
            sx={{ color: '#00ffff' }}
          />
        </Box>
      </Box>

      {/* Display */}
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: '0.7rem', color: '#888', mb: 1 }}>
          DISPLAY
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={settings.showHud}
              onChange={(_, v) => onUpdate({ showHud: v })}
              size="small"
              sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#00ffff' } }}
            />
          }
          label={<Typography sx={{ fontSize: '0.7rem' }}>HUD Overlay</Typography>}
          sx={{ ml: 0, mb: 0.5 }}
        />
        <FormControlLabel
          control={
            <Switch
              checked={settings.showGrid}
              onChange={(_, v) => onUpdate({ showGrid: v })}
              size="small"
              sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#00ffff' } }}
            />
          }
          label={<Typography sx={{ fontSize: '0.7rem' }}>Grid</Typography>}
          sx={{ ml: 0, mb: 0.5 }}
        />
        <FormControlLabel
          control={
            <Switch
              checked={settings.showDetailPanel}
              onChange={(_, v) => onUpdate({ showDetailPanel: v })}
              size="small"
              sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#00ffff' } }}
            />
          }
          label={<Typography sx={{ fontSize: '0.7rem' }}>Detail Panel</Typography>}
          sx={{ ml: 0 }}
        />
      </Box>

      {/* Projection (only in embeddings mode) */}
      {hasEmbeddings && (
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontSize: '0.7rem', color: '#888', mb: 1 }}>
            PROJECTION
          </Typography>
          <Box sx={{ mb: 1.5 }}>
            <ToggleButtonGroup
              value={settings.method}
              exclusive
              onChange={(_, v) => { if (v) onUpdate({ method: v as ProjectionMethod }); }}
              size="small"
              sx={{ '& .MuiToggleButton-root': { color: '#888', fontSize: '0.7rem', fontFamily: 'inherit', '&.Mui-selected': { color: '#00ffff', background: '#00ffff15' } } }}
            >
              <ToggleButton value="umap">UMAP</ToggleButton>
              <ToggleButton value="pca">PCA</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <Box>
            <ToggleButtonGroup
              value={settings.dimensions}
              exclusive
              onChange={(_, v) => { if (v) onUpdate({ dimensions: v as 2 | 3 }); }}
              size="small"
              sx={{ '& .MuiToggleButton-root': { color: '#888', fontSize: '0.7rem', fontFamily: 'inherit', '&.Mui-selected': { color: '#00ffff', background: '#00ffff15' } } }}
            >
              <ToggleButton value={2}>2D</ToggleButton>
              <ToggleButton value={3}>3D</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>
      )}

      {/* Reset */}
      <Button
        onClick={onReset}
        variant="outlined"
        size="small"
        sx={{
          color: '#888',
          borderColor: '#888',
          fontSize: '0.7rem',
          fontFamily: 'inherit',
          '&:hover': { borderColor: '#ccc', color: '#ccc' },
        }}
      >
        Reset Defaults
      </Button>
    </Drawer>
  );
};
