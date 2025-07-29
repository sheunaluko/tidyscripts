'use client';

import React from 'react';
import { Paper, Box, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';

interface WidgetItemProps {
  title: string;
  fullscreen?: boolean;
  onFocus?: () => void;
  onClose?: () => void;
  children: React.ReactNode;
  sx?: any;
}

const WidgetItem: React.FC<WidgetItemProps> = ({
  title,
  fullscreen = false,
  onFocus,
  onClose,
  children,
  sx,
}) => {
  return (
    <Paper
      elevation={3}
      sx={{
        backgroundColor: 'background.paper',
        p: 2,
          height: fullscreen ? '100%' : '300px',
	  width : "100%" ,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        ...sx,
      }}
    >
	<Box display="flex" justifyContent="space-between" alignItems="center" mb={1}

	>
        <Typography variant="subtitle1">{title}</Typography>
        {fullscreen ? (
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        ) : (
          <IconButton size="small" onClick={onFocus}>
            <OpenInFullIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      <Box sx={{
	  overflowY: 'auto' ,
	  flexGrow: 1 ,
	  minHeight : 0 ,
      }}>{children}</Box>
    </Paper>
  );
};

export default WidgetItem;
