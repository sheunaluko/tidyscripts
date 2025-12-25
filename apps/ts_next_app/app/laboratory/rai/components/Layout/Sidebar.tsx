// Sidebar Navigation Component

import React from 'react';
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
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Description,
  Input,
  AutoAwesome,
  EditNote,
  Settings,
  Science,
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material';
import * as tsw from 'tidyscripts_web';
import { useRaiStore } from '../../store/useRaiStore';
import { THEME_CONFIG } from '../../constants';
import { ViewType } from '../../types';

const log = tsw.common.logger.get_logger({ id: 'Sidebar' });

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
}

const ICON_MAP = {
  Description,
  Input,
  AutoAwesome,
  EditNote,
  Science,
  Settings,
} as const;

type IconName = keyof typeof ICON_MAP;

export const Sidebar: React.FC<SidebarProps> = ({ open, onToggle }) => {
  const { currentView, setCurrentView, settings } = useRaiStore();
  const [focusedIndex, setFocusedIndex] = React.useState<number | null>(null);
  const [mounted, setMounted] = React.useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const drawerRef = React.useRef<HTMLDivElement>(null);

  const drawerWidth = open ? THEME_CONFIG.sidebar.widthExpanded : THEME_CONFIG.sidebar.widthCollapsed;
  log(`Render: open=${open}, drawerWidth=${drawerWidth}px, mounted=${mounted}, isMobile=${isMobile}`);

  // Enable transitions after initial mount to prevent layout shift
  React.useEffect(() => {
    log('Mounted - enabling transitions');
    setMounted(true);
  }, []);

  // Log computed styles of drawer
  React.useEffect(() => {
    if (drawerRef.current) {
      const paper = drawerRef.current.querySelector('.MuiDrawer-paper');
      if (paper) {
        const computed = window.getComputedStyle(paper);
        log(`Drawer paper computed: width=${computed.width}, position=${computed.position}, left=${computed.left}`);
      }
    }
  });

  const menuItems: Array<{ id: ViewType; label: string; icon: IconName }> = [
    { id: 'template_picker', label: 'Select Template', icon: 'Description' },
    { id: 'information_input', label: 'Input Information', icon: 'Input' },
    { id: 'note_generator', label: 'Generate Note', icon: 'AutoAwesome' },
  ];

  const bottomMenuItems: Array<{ id: ViewType; label: string; icon: IconName }> = [
    { id: 'template_editor', label: 'Template Editor', icon: 'EditNote' },
    // Conditionally add Test Interface if advanced features enabled
    ...(settings.advancedFeaturesEnabled
      ? [{ id: 'test_interface' as ViewType, label: 'Test Interface', icon: 'Science' as IconName }]
      : []
    ),
    { id: 'settings', label: 'Settings', icon: 'Settings' },
  ];

  const allMenuItems = [...menuItems, ...bottomMenuItems];

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          if (prev === null) return 0;
          return (prev + 1) % allMenuItems.length;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          if (prev === null) return allMenuItems.length - 1;
          return prev === 0 ? allMenuItems.length - 1 : prev - 1;
        });
      } else if (e.key === 'Enter' && focusedIndex !== null) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setCurrentView(allMenuItems[focusedIndex].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedIndex, allMenuItems, setCurrentView]);

  const handleNavigation = (view: ViewType) => {
    setCurrentView(view);
    // Close sidebar on mobile after navigation
    if (isMobile && open) {
      onToggle();
    }
  };

  const renderMenuItem = (item: { id: ViewType; label: string; icon: IconName }, index: number) => {
    const IconComponent = ICON_MAP[item.icon];
    const isActive = currentView === item.id;
    const isFocused = focusedIndex === index;

    return (
      <ListItem key={item.id} disablePadding>
        <Tooltip title={!open ? item.label : ''} placement="right">
          <ListItemButton
            selected={isActive}
            onClick={() => handleNavigation(item.id)}
            sx={{
              minHeight: 48,
              justifyContent: open ? 'initial' : 'center',
              px: 2.5,
              outline: isFocused ? '2px solid' : 'none',
              outlineColor: 'primary.main',
              outlineOffset: '-2px',
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: open ? 3 : 'auto',
                justifyContent: 'center',
                transition: 'none',
              }}
            >
              <IconComponent color={isActive ? 'primary' : 'inherit'} />
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              sx={{
                opacity: open ? 1 : 0,
                transition: open ? 'opacity 3s ease' : 'opacity 0s',
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
      ref={drawerRef}
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          transition: mounted ? THEME_CONFIG.sidebar.transition : 'none',
          overflowX: 'hidden',
          boxSizing: 'border-box',
          zIndex: 1200,
        },
      }}
    >
      {/* Toggle Button */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', p: 1 }}>
        <IconButton onClick={onToggle}>
          {open ? <ChevronLeft /> : <ChevronRight />}
        </IconButton>
      </Box>

      <Divider />

      {/* Navigation Items */}
      <List>
        {menuItems.map((item, index) => renderMenuItem(item, index))}
      </List>

      {/* Bottom Items (Template Editor, Settings) */}
      <Box sx={{ mt: 'auto' }}>
        <Divider />
        <List>
          {bottomMenuItems.map((item, index) => renderMenuItem(item, menuItems.length + index))}
        </List>
      </Box>
    </Drawer>
  );
};
