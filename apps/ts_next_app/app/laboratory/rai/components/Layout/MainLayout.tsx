// Main Layout Component

import React from 'react';
import { Box, useMediaQuery, useTheme, IconButton } from '@mui/material';
import { Menu } from '@mui/icons-material';
import * as tsw from 'tidyscripts_web';
import { Sidebar } from './Sidebar';
import { THEME_CONFIG } from '../../constants';

const log = tsw.common.logger.get_logger({ id: 'MainLayout' });

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const mainContentRef = React.useRef<HTMLDivElement>(null);

  log(`Render: sidebarOpen=${sidebarOpen}, mounted=${mounted}, isMobile=${isMobile}`);

  // Enable transitions after initial mount to prevent layout shift
  React.useEffect(() => {
    log('Mounted - enabling transitions');
    setMounted(true);
  }, []);

  // Update sidebar state when screen size changes
  React.useEffect(() => {
    log('Screen size changed, closing sidebar');
    setSidebarOpen(false);
  }, [isMobile]);

  // Log computed styles of main content
  React.useEffect(() => {
    if (mainContentRef.current) {
      const computed = window.getComputedStyle(mainContentRef.current);
      log(`Main content computed: width=${computed.width}, marginLeft=${computed.marginLeft}, position=${computed.position}`);
    }
  });

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', width: '100vw', overflowX: 'hidden' }}>
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      <Box
        ref={mainContentRef}
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          ml: sidebarOpen
            ? `${THEME_CONFIG.sidebar.widthExpanded}px`
            : `${THEME_CONFIG.sidebar.widthCollapsed}px`,
          transition: mounted ? 'margin-left 0.3s ease' : 'none',
          overflowX: 'hidden',
          minWidth: 0,
        }}
      >
        {children}
      </Box>
    </Box>
  );
};
