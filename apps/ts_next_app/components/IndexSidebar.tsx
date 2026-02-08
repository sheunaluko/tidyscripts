'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  Menu as MenuIcon,
  Feedback as FeedbackIcon,
} from '@mui/icons-material';
import { INDEX_MENU_ITEMS, MenuItem } from '../constants/indexMenuItems';

declare var window: any;

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
  const [feedbackOpen, setFeedbackOpen] = React.useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const pathname = usePathname();
  const isIndexPage = pathname === '/';

  // Apps that manage their own layout — hide floating icon and permanent drawer,
  // but still allow the footer hamburger to force-open as temporary overlay
  const HIDDEN_PATHS = ['/laboratory/rai', '/apps/rai', '/laboratory/cortex_0'];
  const isHiddenApp = HIDDEN_PATHS.some(p => pathname?.startsWith(p));

  // On non-index pages, mobile, or hidden apps — always use temporary overlay
  const useTemporaryDrawer = !isIndexPage || isMobile || isHiddenApp;

  const drawerWidth = open ? SIDEBAR_CONFIG.widthExpanded : SIDEBAR_CONFIG.widthCollapsed;

  // Enable transitions after initial mount to prevent layout shift
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Expose global opener so the footer hamburger can open the sidebar (even on hidden-app pages)
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      window.openNavSidebar = () => {
        if (!open) onToggle();
      };
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete window.openNavSidebar;
      }
    };
  }, [open, onToggle]);

  const handleAutoClose = () => {
    if (useTemporaryDrawer && open) {
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
              onClick={handleAutoClose}
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
            onClick={handleAutoClose}
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
    <>
      {/* Floating menu button for non-index pages when drawer is closed (hidden on app pages — footer handles it) */}
      {useTemporaryDrawer && !open && !isHiddenApp && (
        <IconButton
          onClick={onToggle}
          sx={{
            position: 'fixed',
            top: 12,
            left: 12,
            zIndex: 1300,
            opacity: 0.5,
            '&:hover': { opacity: 1 },
            transition: 'opacity 0.2s',
          }}
        >
          <MenuIcon color="primary" />
        </IconButton>
      )}

      <Drawer
        variant={useTemporaryDrawer ? 'temporary' : 'permanent'}
        open={useTemporaryDrawer ? open : true}
        onClose={useTemporaryDrawer ? onToggle : undefined}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          width: useTemporaryDrawer ? 0 : drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: useTemporaryDrawer ? SIDEBAR_CONFIG.widthExpanded : drawerWidth,
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
        <List sx={{ flexGrow: 1 }}>
          {INDEX_MENU_ITEMS.map((item) => renderMenuItem(item))}
        </List>
        <Divider />
        <List>
          <ListItem disablePadding>
            <Tooltip title={!open ? 'Feedback' : ''} placement="right">
              <ListItemButton
                onClick={() => {
                  if (typeof window !== 'undefined' && window.openFeedbackPanel) {
                    window.openFeedbackPanel();
                  }
                  handleAutoClose();
                }}
                sx={{
                  minHeight: 48,
                  justifyContent: open ? 'initial' : 'center',
                  px: 2.5,
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: open ? 3 : 'auto',
                    justifyContent: 'center',
                  }}
                >
                  <FeedbackIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Feedback"
                  sx={{
                    opacity: open ? 1 : 0,
                    transition: open ? 'opacity 0.3s ease' : 'opacity 0s',
                    whiteSpace: 'nowrap',
                  }}
                />
              </ListItemButton>
            </Tooltip>
          </ListItem>
        </List>
      </Drawer>
    </>
  );
};

export default IndexSidebar;
