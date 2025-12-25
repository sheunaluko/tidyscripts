// URL Hash Router for RAI App
// Provides hash-based routing for deep linking and browser history support

import * as tsw from 'tidyscripts_web';
import { ViewType } from '../types';

const log = tsw.common.logger.get_logger({ id: 'router' });

// Route configuration mapping
export const ROUTES = {
  // Simple routes
  HOME: { pattern: '', view: 'template_picker' as ViewType },
  TEMPLATES: { pattern: 'templates', view: 'template_picker' as ViewType },
  INPUT: { pattern: 'input', view: 'information_input' as ViewType },
  GENERATOR: { pattern: 'generator', view: 'note_generator' as ViewType },
  SETTINGS: { pattern: 'settings', view: 'settings' as ViewType },
  TEST: { pattern: 'test', view: 'test_interface' as ViewType },

  // Template editor routes
  TEMPLATE_EDITOR_LIST: {
    pattern: 'templates/edit',
    view: 'template_editor' as ViewType,
    mode: 'list' as const
  },
  TEMPLATE_EDITOR_CREATE: {
    pattern: 'templates/create',
    view: 'template_editor' as ViewType,
    mode: 'create' as const
  },
  TEMPLATE_EDITOR_EDIT: {
    pattern: 'templates/edit/:templateId',
    view: 'template_editor' as ViewType,
    mode: 'edit' as const
  },

  // Test run routes
  TEST_RUN: {
    pattern: 'test/run/:runId',
    view: 'test_interface' as ViewType
  },
} as const;

// Parse result type
export interface ParsedRoute {
  view: ViewType;
  params: Record<string, string>;
  mode?: 'list' | 'create' | 'edit';
  isValid: boolean;
  error?: string;
}

/**
 * Parse URL hash into route object
 * @param hash - URL hash string (with or without '#')
 * @returns Parsed route with view, params, and validation status
 *
 * @example
 * parseHash('templates/edit/initial_consultation')
 * // Returns: { view: 'template_editor', params: { templateId: 'initial_consultation' }, mode: 'edit', isValid: true }
 */
export function parseHash(hash: string): ParsedRoute {
  // Normalize hash (remove leading '#' if present)
  const normalizedHash = hash.replace(/^#/, '').trim();

  log(`Parsing hash: "${normalizedHash}"`);

  // Empty hash → default to template_picker
  if (!normalizedHash) {
    return {
      view: 'template_picker',
      params: {},
      isValid: true,
    };
  }

  // Try to match against all route patterns
  for (const [routeName, routeConfig] of Object.entries(ROUTES)) {
    const match = matchRoute(normalizedHash, routeConfig.pattern);

    if (match.matched) {
      log(`Matched route: ${routeName}`);

      // Validate params if needed
      const validation = validateRouteParams(routeConfig, match.params);

      return {
        view: routeConfig.view,
        params: match.params,
        mode: 'mode' in routeConfig ? routeConfig.mode : undefined,
        isValid: validation.isValid,
        error: validation.error,
      };
    }
  }

  // No match found
  log(`No route matched for hash: "${normalizedHash}"`);
  return {
    view: 'template_picker',
    params: {},
    isValid: false,
    error: `Invalid route: ${normalizedHash}`,
  };
}

/**
 * Match hash against route pattern
 * @param hash - Normalized hash string
 * @param pattern - Route pattern (e.g., 'test/run/:runId')
 * @returns Match result with params
 *
 * @example
 * matchRoute('test/run/abc-123', 'test/run/:runId')
 * // Returns: { matched: true, params: { runId: 'abc-123' } }
 */
function matchRoute(hash: string, pattern: string): {
  matched: boolean;
  params: Record<string, string>;
} {
  // Split into segments
  const hashSegments = hash.split('/');
  const patternSegments = pattern.split('/');

  // Quick length check
  if (hashSegments.length !== patternSegments.length) {
    return { matched: false, params: {} };
  }

  const params: Record<string, string> = {};

  // Match segment by segment
  for (let i = 0; i < patternSegments.length; i++) {
    const patternSegment = patternSegments[i];
    const hashSegment = hashSegments[i];

    // Parameter segment (starts with ':')
    if (patternSegment.startsWith(':')) {
      const paramName = patternSegment.slice(1);
      params[paramName] = decodeURIComponent(hashSegment);
    }
    // Literal segment - must match exactly
    else if (patternSegment !== hashSegment) {
      return { matched: false, params: {} };
    }
  }

  return { matched: true, params };
}

/**
 * Validate route parameters (check format)
 * @param routeConfig - Route configuration
 * @param params - Extracted params from hash
 * @returns Validation result
 */
function validateRouteParams(
  routeConfig: any,
  params: Record<string, string>
): { isValid: boolean; error?: string } {
  // Validate template ID format
  if (params.templateId) {
    // Template IDs should be alphanumeric with underscores/hyphens
    if (!params.templateId.match(/^[a-z0-9_-]+$/i)) {
      return {
        isValid: false,
        error: `Invalid template ID format: ${params.templateId}`,
      };
    }
  }

  // Validate test run ID format (UUID)
  if (params.runId) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(params.runId)) {
      return {
        isValid: false,
        error: `Invalid test run ID format: ${params.runId}`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Generate hash from app state
 * @param view - Current view
 * @param options - Additional options (mode, IDs, etc.)
 * @returns Hash string (without leading '#')
 *
 * @example
 * generateHash('template_editor', { templateEditorMode: 'edit', templateId: 'template-123' })
 * // Returns: 'templates/edit/template-123'
 */
export function generateHash(
  view: ViewType,
  options?: {
    templateEditorMode?: 'list' | 'create' | 'edit';
    templateId?: string;
    testRunId?: string;
  }
): string {
  const opts = options || {};

  switch (view) {
    case 'template_picker':
      return 'templates';

    case 'information_input':
      return 'input';

    case 'note_generator':
      return 'generator';

    case 'settings':
      return 'settings';

    case 'test_interface':
      if (opts.testRunId) {
        return `test/run/${encodeURIComponent(opts.testRunId)}`;
      }
      return 'test';

    case 'template_editor':
      if (opts.templateEditorMode === 'create') {
        return 'templates/create';
      } else if (opts.templateEditorMode === 'edit' && opts.templateId) {
        return `templates/edit/${encodeURIComponent(opts.templateId)}`;
      } else {
        return 'templates/edit';
      }

    default:
      log(`Unknown view type: ${view}, defaulting to templates`);
      return 'templates';
  }
}

/**
 * Update URL hash without triggering navigation
 * Uses pushState to create browser history entry
 * @param hash - New hash (without leading '#')
 *
 * @example
 * updateHash('templates/edit/template-123')
 * // Updates URL to: /laboratory/rai#templates/edit/template-123
 */
export function updateHash(hash: string) {
  const newHash = `#${hash}`;

  // Only update if hash actually changed
  if (window.location.hash !== newHash) {
    // Use pushState to update URL without reload
    window.history.pushState(null, '', newHash);
    log(`Updated hash: ${newHash}`);
  }
}

/**
 * Get current hash from URL
 * @returns Current hash without leading '#'
 *
 * @example
 * getCurrentHash()
 * // If URL is /laboratory/rai#test, returns: 'test'
 */
export function getCurrentHash(): string {
  return window.location.hash.replace(/^#/, '');
}
