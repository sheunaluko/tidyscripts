// Template Parser - Extract variables from template strings

import * as tsw from 'tidyscripts_web';
import { NoteTemplate } from '../types';
import initialConsultationRaw from '../templates/initial_consultation.json';
import ivfCycleMonitoringRaw from '../templates/ivf_cycle_monitoring.json';
import ultrasoundFindingsRaw from '../templates/ultrasound_findings.json';

const log = tsw.common.logger.get_logger({ id: 'rai' });
const debug = tsw.common.util.debug;

/**
 * Extract {{VARIABLE_NAME}} placeholders from template text
 * @param template - The template string containing {{VARIABLE}} placeholders
 * @returns Array of unique variable names
 */
export function extractVariables(template: string): string[] {
  const regex = /\{\{([A-Z_]+)\}\}/g;
  const matches: string[] = [];
  let match;

  while ((match = regex.exec(template)) !== null) {
    matches.push(match[1]);
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
