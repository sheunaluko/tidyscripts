// Template Parser - Extract variables from template strings

import * as tsw from 'tidyscripts_web';
import { NoteTemplate } from '../types';
import { DEFAULT_TEMPLATE_IDS } from '../constants';
import initialConsultationRaw from '../templates/initial_consultation.json';
import ivfCycleMonitoringRaw from '../templates/ivf_cycle_monitoring.json';
import ultrasoundFindingsRaw from '../templates/ultrasound_findings.json';

const log = tsw.common.logger.get_logger({ id: 'rai' });
const debug = tsw.common.util.debug;

/**
 * Extract variable placeholders from template text
 * Supports both traditional {{VARIABLE}} and new {{ @variable | fallback }} syntax
 * @param template - The template string containing variable placeholders
 * @returns Array of unique variable names
 */
export function extractVariables(template: string): string[] {
  const matches: string[] = [];

  // Pattern 1: Traditional {{VARIABLE}} syntax
  const traditionalRegex = /\{\{([A-Z_]+)\}\}/g;
  let match;
  while ((match = traditionalRegex.exec(template)) !== null) {
    matches.push(match[1]);
  }

  // Pattern 2: New {{ @variable | fallback }} or {{ @variable? | ... }} syntax
  // Matches: {{ @variable_name or {{ @variable_name? (with optional ?)
  const newSyntaxRegex = /\{\{\s*@(\w+)\??/g;
  while ((match = newSyntaxRegex.exec(template)) !== null) {
    // Convert to uppercase with underscores for consistency
    const varName = match[1].toUpperCase();
    matches.push(varName);
  }

  const variables = Array.from(new Set(matches));

  debug.add('variables_extracted', { count: variables.length, variables });

  return variables;
}

/**
 * Parse and enhance a loaded template by extracting its variables
 * @param template - Raw template object from JSON
 * @returns Enhanced template with extracted variables
 */
export function parseTemplate(template: Omit<NoteTemplate, 'variables'>): NoteTemplate {
  const variables = extractVariables(template.template);

  const parsed: NoteTemplate = {
    ...template,
    variables,
  };

  debug.add('template_parsed', { id: template.id, variableCount: variables.length });

  return parsed;
}

/**
 * Load and parse all templates from imported JSON
 * @returns Array of parsed templates
 */
export function loadTemplates(): NoteTemplate[] {
  log('Loading templates...');

  const rawTemplates = [
    initialConsultationRaw,
    ivfCycleMonitoringRaw,
    ultrasoundFindingsRaw,
  ];

  const templates = rawTemplates.map((raw) => parseTemplate(raw as Omit<NoteTemplate, 'variables'>));

  debug.add('all_templates_loaded', { count: templates.length, templates });

  return templates;
}

/**
 * Parse pre-loaded custom template data into NoteTemplate array.
 * Accepts data already retrieved from any storage backend.
 * @param data - Array of raw template objects (parsed JSON)
 * @returns Array of custom templates
 */
export function loadCustomTemplatesFromData(data: any[]): NoteTemplate[] {
  if (!data || !Array.isArray(data)) return [];

  const templates = data.map((t: any) => parseTemplate({
    ...t,
    createdAt: t.createdAt instanceof Date ? t.createdAt : new Date(t.createdAt),
    updatedAt: t.updatedAt instanceof Date ? t.updatedAt : new Date(t.updatedAt),
    isDefault: false,
  }));

  debug.add('custom_templates_loaded_from_data', { count: templates.length });
  return templates;
}

/**
 * Generate a unique ID for custom templates
 * @returns Unique template ID with 'custom_' prefix
 */
export function generateCustomTemplateId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `custom_${timestamp}_${random}`;
}

/**
 * Check if a template ID belongs to a default template
 * @param id - Template ID to check
 * @returns True if template is a default template
 */
export function isDefaultTemplate(id: string): boolean {
  return DEFAULT_TEMPLATE_IDS.includes(id as any);
}

/**
 * Validation result for template data
 */
export interface TemplateValidation {
  isValid: boolean;
  errors: {
    title?: string;
    description?: string;
    template?: string;
  };
  warnings: string[];
}

/**
 * Validate template data before saving
 * @param data - Template data to validate
 * @param existingTemplates - All existing templates for duplicate checking
 * @param editingId - ID of template being edited (for uniqueness check)
 * @returns Validation result with errors and warnings
 */
export function validateTemplate(
  data: Partial<NoteTemplate>,
  existingTemplates: NoteTemplate[],
  editingId?: string
): TemplateValidation {
  const errors: TemplateValidation['errors'] = {};
  const warnings: string[] = [];

  // Title validation
  if (!data.title?.trim()) {
    errors.title = 'Title is required';
  } else if (data.title.length < 3) {
    errors.title = 'Title must be at least 3 characters';
  } else if (data.title.length > 100) {
    errors.title = 'Title must be less than 100 characters';
  } else if (!/^[a-zA-Z0-9\s\-()]+$/.test(data.title)) {
    errors.title = 'Title contains invalid characters (use only letters, numbers, spaces, hyphens, parentheses)';
  } else {
    // Check uniqueness
    const duplicate = existingTemplates.find(
      t => t.title.toLowerCase() === data.title!.toLowerCase() && t.id !== editingId
    );
    if (duplicate) {
      errors.title = 'A template with this title already exists';
    }
  }

  // Description validation
  if (!data.description?.trim()) {
    errors.description = 'Description is required';
  } else if (data.description.length < 10) {
    errors.description = 'Description must be at least 10 characters';
  } else if (data.description.length > 500) {
    errors.description = 'Description must be less than 500 characters';
  }

  // Template validation
  if (!data.template?.trim()) {
    errors.template = 'Template text is required';
  } else if (data.template.length < 50) {
    errors.template = 'Template must be at least 50 characters';
  } else {
    // Check for variables (support both {{VAR}} and {{ @var | fallback }} syntax)
    const hasTraditionalVars = /\{\{[A-Z_]+\}\}/.test(data.template);
    const hasNewVars = /\{\{\s*@\w+/.test(data.template);

    if (!hasTraditionalVars && !hasNewVars) {
      errors.template = 'Template must contain at least one variable ({{VARIABLE}} or {{ @variable | fallback }})';
    }

    // Check for malformed placeholders
    const openBraces = (data.template.match(/\{\{/g) || []).length;
    const closeBraces = (data.template.match(/\}\}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.template = 'Template contains mismatched {{ }} brackets';
    }

    // Extract traditional variables and check naming
    const variables = extractVariables(data.template);
    const invalidVars = variables.filter(v => !/^[A-Z][A-Z0-9_]*$/.test(v));
    if (invalidVars.length > 0) {
      errors.template = `Invalid variable names: ${invalidVars.join(', ')}. Variables must be uppercase with underscores (e.g., {{PATIENT_NAME}})`;
    }

    // Warnings
    if (variables.length > 20) {
      warnings.push('Template has many variables (>20). Consider simplifying or breaking into multiple templates.');
    }
    if (data.template.length > 5000) {
      warnings.push('Template is very long (>5000 characters). Consider breaking into multiple smaller templates.');
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings,
  };
}

/**
 * Normalize dot phrase title for matching
 * Converts spaces to dashes and makes uppercase
 * @param title - Raw title from user input
 * @returns Normalized title (e.g., "HPI Differential" -> "HPI-DIFFERENTIAL")
 */
export function normalizeDotPhraseTitle(title: string): string {
  return title.trim().replace(/\s+/g, '-');
}

/**
 * Generate a unique ID for dot phrases
 * @returns Unique dot phrase ID with 'dotphrase_' prefix
 */
export function generateDotPhraseId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `dotphrase_${timestamp}_${random}`;
}

