// RAI App Constants

import { AppSettings } from './types';

// Theme Configuration
export const THEME_CONFIG = {
  sidebar: {
    widthCollapsed: 60,
    widthExpanded: 240,
    transition: '0.3s ease',
  },
  colors: {
    primary: '#1976d2',
    secondary: '#dc004e',
    info: '#0288d1',
    success: '#2e7d32',
    warning: '#ed6c02',
    error: '#d32f2f',
  },
  animations: {
    fadeIn: 'fadeIn 0.3s ease-in',
    slideIn: 'slideIn 0.4s ease-out',
    duration: {
      short: 200,
      medium: 300,
      long: 500,
    },
  },
  spacing: {
    small: 1,
    medium: 2,
    large: 3,
    xlarge: 4,
  },
};

// Supported AI Models
export const SUPPORTED_MODELS = [
  'gemini-3-pro-preview',
  'gemini-3-flash-preview',
  'gpt-5.2',
  'gpt-5-mini',
  'gpt-5-nano',
  'claude-sonnet-4-5',
  'claude-haiku-4-5',
  'claude-opus-4-5',
];

// Default Settings
export const DEFAULT_SETTINGS: AppSettings = {
  inputMode: 'voice',
  aiModel: 'gemini-3-flash-preview',
  autostartAgent: false,
  autostartGeneration: false,
};

// LocalStorage Keys
export const STORAGE_KEYS = {
  settings: 'rai_settings',
};

// Navigation Menu Items
export const MENU_ITEMS = [
  { id: 'template_picker', label: 'Templates', icon: 'Description' },
  { id: 'information_input', label: 'Input', icon: 'Input' },
  { id: 'note_generator', label: 'Generate', icon: 'AutoAwesome' },
] as const;
