'use client';

import React from 'react';
import { Box, useTheme } from '@mui/material';
import { ObjectInspector } from 'react-inspector';
import WidgetItem from '../WidgetItem';

interface WorkspaceWidgetProps {
  fullscreen?: boolean;
  onFocus?: () => void;
  onClose?: () => void;
  workspace: any;
}

const WorkspaceWidget: React.FC<WorkspaceWidgetProps> = ({
  fullscreen = false,
  onFocus,
  onClose,
  workspace
}) => {
  const theme = useTheme();

  const widget_scroll_styles = {
    overflowY: 'auto',
    maxHeight: '95%',
    scrollbarWidth: 'none',         // Firefox
    '&::-webkit-scrollbar': {
      display: 'none',              // Chrome, Safari
    }
  };

  return (
    <WidgetItem
      title="Workspace"
      fullscreen={fullscreen}
      onFocus={onFocus}
      onClose={onClose}
    >
      <Box id="workspace_display" sx={widget_scroll_styles}>
        <ObjectInspector
          style={{ width: "90%", marginTop: "10px" }}
          theme={theme.palette.mode === "dark" ? "chromeDark" : "chromeLight"}
          data={workspace}
          expandPaths={['$', '$.*', '$.*.*']}
        />
      </Box>
    </WidgetItem>
  );
};

export default React.memo(WorkspaceWidget);
