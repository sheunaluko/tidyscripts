'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Box, IconButton, CircularProgress, Typography } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import type { EveProps, EvePoint } from './lib/types';
import { getThemeById } from './lib/themes';
import { useEveSettings } from './lib/useEveSettings';
import { useEve } from './lib/useEve';
import { projectEmbeddings } from './lib/projection';
import { HudOverlay } from './HudOverlay';
import { EveTooltip } from './Tooltip';
import { DetailPanel } from './DetailPanel';
import { SettingsPanel } from './SettingsPanel';

export const Eve: React.FC<EveProps> = ({
  embeddings,
  points: externalPoints,
  query,
  method: methodProp,
  dimensions: dimensionsProp,
  colorBy,
  numClusters,
  onPointSelect,
  showDetailPanel: showDetailPanelProp,
  showSettings: showSettingsProp = true,
}) => {
  const { settings, updateSettings, resetSettings } = useEveSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [projectedPoints, setProjectedPoints] = useState<EvePoint[]>([]);
  const [isProjecting, setIsProjecting] = useState(false);

  const theme = getThemeById(settings.themeId);
  const method = methodProp ?? settings.method;
  const dimensions = dimensionsProp ?? settings.dimensions;
  const showDetail = showDetailPanelProp ?? settings.showDetailPanel;

  // Determine which points to render
  const activePoints = externalPoints ?? projectedPoints;

  // Project embeddings when provided
  useEffect(() => {
    if (!embeddings || embeddings.length === 0) {
      setProjectedPoints([]);
      return;
    }

    let cancelled = false;
    setIsProjecting(true);

    projectEmbeddings(embeddings, method, dimensions).then((result) => {
      if (!cancelled) {
        setProjectedPoints(result);
        setIsProjecting(false);
      }
    }).catch(() => {
      if (!cancelled) setIsProjecting(false);
    });

    return () => { cancelled = true; };
  }, [embeddings, method, dimensions]);

  const {
    canvasRef,
    containerRef,
    hoveredPoint,
    selectedPoint,
    cursorPosition,
    clusterCount,
    setSelectedPoint,
  } = useEve(activePoints, theme, settings, query, colorBy, numClusters, onPointSelect);

  const handleCloseDetail = useCallback(() => {
    setSelectedPoint(null);
  }, [setSelectedPoint]);

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'relative',
        width: '100%',
        minHeight: 400,
        height: 500,
        background: theme.background,
        borderRadius: 2,
        overflow: 'hidden',
        border: `1px solid ${theme.primary}20`,
      }}
    >
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />

      {/* HUD Overlay */}
      <HudOverlay
        theme={theme}
        pointCount={activePoints.length}
        method={method}
        dimensions={dimensions}
        visible={settings.showHud}
        clusterCount={clusterCount}
      />

      {/* Tooltip */}
      <EveTooltip
        point={hoveredPoint}
        cursorPosition={cursorPosition}
        theme={theme}
      />

      {/* Detail Panel */}
      <DetailPanel
        point={selectedPoint}
        theme={theme}
        visible={showDetail}
        onClose={handleCloseDetail}
      />

      {/* Settings gear */}
      {showSettingsProp && (
        <IconButton
          onClick={() => setSettingsOpen(true)}
          size="small"
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            color: `${theme.primary}80`,
            zIndex: 5,
            '&:hover': { color: theme.primary, background: `${theme.primary}15` },
          }}
        >
          <SettingsIcon fontSize="small" />
        </IconButton>
      )}

      {/* Settings Panel */}
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onUpdate={updateSettings}
        onReset={resetSettings}
        hasEmbeddings={!!embeddings && embeddings.length > 0}
      />

      {/* Loading overlay */}
      {isProjecting && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: `${theme.background}cc`,
            zIndex: 20,
            gap: 2,
          }}
        >
          <CircularProgress
            size={40}
            sx={{ color: theme.primary }}
          />
          <Typography
            sx={{
              color: theme.primary,
              fontFamily: '"Share Tech Mono", "Courier New", monospace',
              fontSize: '0.8rem',
              letterSpacing: 2,
            }}
          >
            PROJECTING...
          </Typography>
        </Box>
      )}
    </Box>
  );
};
