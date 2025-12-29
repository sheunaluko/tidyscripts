'use client';

import React from 'react';
import Link from 'next/link';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Box,
  Divider,
  Tooltip,
  Collapse,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  ExpandLess,
  ExpandMore,
} from '@mui/icons-material';
import { INDEX_MENU_ITEMS, MenuItem } from '../constants/indexMenuItems';

const SIDEBAR_CONFIG = {
  widthCollapsed: 60,
  widthExpanded: 280,
  transition: '0.3s ease',
};

interface IndexSidebarProps {
  open: boolean;
  onToggle: () => void;
  expandedItems: Set<string>;
  onToggleExpanded: (itemId: string) => void;
}

export const IndexSidebar: React.FC<IndexSidebarProps> = ({
  open,
  onToggle,
  expandedItems,
  onToggleExpanded,
}) => {
  const [mounted, setMounted] = React.useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const drawerWidth = open ? SIDEBAR_CONFIG.widthExpanded : SIDEBAR_CONFIG.widthCollapsed;

  // Enable transitions after initial mount to prevent layout shift
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleMobileClose = () => {
    if (isMobile && open) {
      onToggle();
    }
  };

  const renderMenuItem = (item: MenuItem, isNested: boolean = false): React.ReactNode => {
    const IconComponent = item.icon;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);

    // Parent item with children (expandable)
    if (hasChildren) {
      return (
        <React.Fragment key={item.id}>
          <ListItem disablePadding>
            <Tooltip title={!open ? item.label : ''} placement="right">
              <ListItemButton
                onClick={() => onToggleExpanded(item.id)}
                sx={{
                  minHeight: 48,
                  justifyContent: open ? 'initial' : 'center',
                  px: 2.5,
                  pl: isNested ? 4 : 2.5,
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: open ? 3 : 'auto',
                    justifyContent: 'center',
                  }}
                >
                  <IconComponent />
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  sx={{
                    opacity: open ? 1 : 0,
                    transition: open ? 'opacity 0.3s ease' : 'opacity 0s',
                    whiteSpace: 'nowrap',
                  }}
                />
                {open && (isExpanded ? <ExpandLess /> : <ExpandMore />)}
              </ListItemButton>
            </Tooltip>
          </ListItem>
          <Collapse in={isExpanded && open} timeout="auto" unmountOnExit>
            <List disablePadding>
              {item.children!.map((child) => renderMenuItem(child, true))}
            </List>
          </Collapse>
        </React.Fragment>
      );
    }

    // Regular menu item (leaf node)
    if (item.external) {
      return (
        <ListItem key={item.id} disablePadding>
          <Tooltip title={!open ? item.label : ''} placement="right">
            <ListItemButton
              component="a"
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleMobileClose}
              sx={{
                minHeight: 48,
                justifyContent: open ? 'initial' : 'center',
                px: 2.5,
                pl: isNested ? 4 : 2.5,
              }}
            >
              {!isNested && (
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: open ? 3 : 'auto',
                    justifyContent: 'center',
                  }}
                >
                  <IconComponent />
                </ListItemIcon>
              )}
              <ListItemText
                primary={item.label}
                sx={{
                  opacity: open ? 1 : 0,
                  transition: open ? 'opacity 0.3s ease' : 'opacity 0s',
                  whiteSpace: 'nowrap',
                }}
              />
            </ListItemButton>
          </Tooltip>
        </ListItem>
      );
    }

    // Internal navigation link
    return (
      <ListItem key={item.id} disablePadding>
        <Tooltip title={!open ? item.label : ''} placement="right">
          <ListItemButton
            component={Link}
            href={item.href || '#'}
            onClick={handleMobileClose}
            sx={{
              minHeight: 48,
              justifyContent: open ? 'initial' : 'center',
              px: 2.5,
              pl: isNested ? 4 : 2.5,
            }}
          >
            {!isNested && (
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: open ? 3 : 'auto',
                  justifyContent: 'center',
                }}
              >
                <IconComponent />
              </ListItemIcon>
            )}
            <ListItemText
              primary={item.label}
              sx={{
                opacity: open ? 1 : 0,
                transition: open ? 'opacity 0.3s ease' : 'opacity 0s',
                whiteSpace: 'nowrap',
              }}
            />
          </ListItemButton>
        </Tooltip>
      </ListItem>
    );
  };

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'permanent'}
      open={isMobile ? open : true}
      onClose={isMobile ? onToggle : undefined}
      ModalProps={{
        keepMounted: true, // Better mobile performance
      }}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          transition: mounted ? SIDEBAR_CONFIG.transition : 'none',
          overflowX: 'hidden',
          boxSizing: 'border-box',
          zIndex: 1200,
          position: 'fixed',
          left: 0,
          top: 0,
          height: '100vh',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: open ? 'flex-end' : 'center',
          px: 1,
          py: 2,
        }}
      >
        <IconButton onClick={onToggle}>
          {open ? <ChevronLeft /> : <ChevronRight />}
        </IconButton>
      </Box>
      <Divider />
      <List>
        {INDEX_MENU_ITEMS.map((item) => renderMenuItem(item))}
      </List>
    </Drawer>
  );
};

export default IndexSidebar;
