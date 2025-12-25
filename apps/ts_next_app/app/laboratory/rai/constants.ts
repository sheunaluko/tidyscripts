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
  showDefaultTemplates: true,
};

// LocalStorage Keys
export const STORAGE_KEYS = {
  settings: 'rai_settings',
  customTemplates: 'rai_custom_templates',
};

// Default Template IDs (file-based templates)
export const DEFAULT_TEMPLATE_IDS = [
  'initial_consultation',
  'ivf_cycle_monitoring',
  'ultrasound_findings',
] as const;

// Navigation Menu Items
export const MENU_ITEMS = [
  { id: 'template_picker', label: 'Templates', icon: 'Description' },
  { id: 'information_input', label: 'Input', icon: 'Input' },
  { id: 'note_generator', label: 'Generate', icon: 'AutoAwesome' },
] as const;

// Template Syntax Documentation (used in both UI and LLM prompts)
export const TEMPLATE_SYNTAX = {
  description: 'Templates support two types of variable syntax for dynamic content',

  patterns: [
    {
      name: 'Presence/Absence (one | separator)',
      syntax: '{{ @variable | fallback }}',
      rules: [
        'If variable has data → use the variable value',
        'If variable absent → use fallback text',
      ],
      examples: [
        '{{ @reason | consultation }} → "initial fertility workup" OR "consultation"',
        '{{ Semen analysis: @results | f/u semen analysis }} → "Semen analysis: 15M/mL" OR "f/u semen analysis"',
      ],
      notes: 'Text before/after @variable (prefix/postfix) is included only when variable is present',
    },
    {
      name: 'Boolean (two | separators, variable ends with ?)',
      syntax: '{{ @variable? | text_if_true | text_if_false }}',
      rules: [
        'If variable is true/yes/present → use first text',
        'If variable is false/no/absent → use second text',
      ],
      examples: [
        '{{ @needs_appointment? | [ ] schedule appointment | no appointment needed }}',
        '{{ @is_male? | Male factor evaluation | Female factor evaluation }}',
      ],
      notes: 'Use the ? suffix to indicate boolean variables',
    },
  ],

  traditional: {
    name: 'Traditional (legacy)',
    syntax: '{{VARIABLE_NAME}}',
    rules: [
      'All uppercase letters and underscores',
      'Simple placeholder replacement',
    ],
    examples: [
      '{{PATIENT_NAME}} → "John Doe"',
      '{{VISIT_DATE}} → "2024-03-15"',
    ],
  },
} as const;
