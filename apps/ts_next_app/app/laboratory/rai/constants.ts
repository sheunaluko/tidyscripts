// RAI App Constants

import { AppSettings } from './types';
import { getRegisteredModels } from 'tidyscripts_common/src/apis/cortex/model_registry';

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

// Supported AI Models - from model registry
export const SUPPORTED_MODELS = getRegisteredModels();

// Default Settings
export const DEFAULT_SETTINGS: AppSettings = {
  inputMode: 'voice',
  aiModel: 'gpt-5.2',                 // Model for note generation
  agentModel: 'gpt-5-mini',           // Model for voice agent (faster for conversation)
  autostartAgent: false,
  autostartGeneration: false,
  showDefaultTemplates: true,
  advancedFeaturesEnabled: false,
  vadThreshold: 0.8,                  // VAD positive speech threshold (0.0-1.0)
  vadSilenceDurationMs: 750,          // Legacy: not used with Tivi
  useUnstructuredMode: false,
  tiviMode: 'guarded',                // Voice recognition mode: guarded, responsive, continuous
  playbackRate: 1.5,                  // TTS playback rate
};

// Advanced Features Password Hash (SHA-256)
export const ADVANCED_FEATURES_PASSWORD_HASH =
  '79e040d13c4ce2d6b75db910c64e927d23d06ef5863faaefe4cfa8dcc226b8b0';

// LocalStorage Keys
export const STORAGE_KEYS = {
  settings: 'rai_settings',
  customTemplates: 'rai_custom_templates',
  testRuns: 'rai_test_runs',
  dotPhrases: 'rai_dot_phrases',
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
      name: 'Boolean (three | separators, variable ends with ?)',
      syntax: '{{ @variable? | text_if_true | text_if_false | text_if_undefined }}',
      rules: [
        'If variable is true/yes → use first text',
        'If variable is false/no → use second text',
        'If variable is undefined/missing → use third text',
      ],
      examples: [
        '{{ @needs_appointment? | [ ] schedule appointment | no appointment needed | appointment status unknown }}',
        '{{ @is_male? | Male factor evaluation | Female factor evaluation | Gender not specified }}',
        '{{ @smoking? | Patient smokes | Non-smoker | Smoking history not documented }}',
      ],
      notes: 'Use the ? suffix to indicate boolean variables. All three conditions must be provided.',
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

  specialMarkers: {
    name: 'Template End Marker',
    marker: '@END_TEMPLATE',
    description: 'Content after this marker is visible to voice agent but hidden from note generator',
    usage: 'Use this to give voice agent instructions about required fields and collection strategy',
    example: `# Template Content
{{ @age | not documented }}
{{ @consult_needed? | Yes | No | Not assessed }}

@END_TEMPLATE

## VOICE AGENT INSTRUCTIONS
### REQUIRED FIELDS
Make sure I specify: age, consult_needed

### COLLECTION STRATEGY
1. Always ask patient age if not mentioned
2. Confirm whether specialist consult is needed`,
  },
} as const;
