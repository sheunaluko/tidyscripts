/**
 * Configuration Management for Tidyscripts Introspection System
 *
 * Handles loading and validation of configuration from environment variables.
 */

import {
  DEFAULT_JDOC_PATH,
  DEFAULT_PROJECT_ROOT,
  DEFAULT_SURREAL_URL,
  DEFAULT_SURREAL_NAMESPACE,
  DEFAULT_SURREAL_DATABASE,
  ENV_VARS,
} from './constants';
import type { SurrealConfig, IntrospectionConfig } from './types';

// ============================================================================
// Environment Variable Loading
// ============================================================================

/**
 * Load SurrealDB configuration from environment variables
 *
 * Environment variables (all prefixed with TS_INTROSPECTION_SURREAL_):
 * - TS_INTROSPECTION_SURREAL_URL - Connection URL (default: http://localhost:8000)
 * - TS_INTROSPECTION_SURREAL_NAMESPACE - Namespace (default: tidyscripts)
 * - TS_INTROSPECTION_SURREAL_DATABASE - Database name (default: introspection)
 * - TS_INTROSPECTION_SURREAL_USER - Username (required if auth is enabled)
 * - TS_INTROSPECTION_SURREAL_PASSWORD - Password (required if auth is enabled)
 *
 * @returns SurrealDB configuration object
 * @throws Error if required credentials are missing when auth is needed
 */
export function loadSurrealConfig(): SurrealConfig {
  const url = process.env[ENV_VARS.SURREAL_URL] || DEFAULT_SURREAL_URL;
  const namespace = process.env[ENV_VARS.SURREAL_NAMESPACE] || DEFAULT_SURREAL_NAMESPACE;
  const database = process.env[ENV_VARS.SURREAL_DATABASE] || DEFAULT_SURREAL_DATABASE;
  const user = process.env[ENV_VARS.SURREAL_USER] || '';
  const password = process.env[ENV_VARS.SURREAL_PASSWORD] || '';

  // Validate configuration
  if (user && !password) {
    throw new Error(
      `${ENV_VARS.SURREAL_USER} is set but ${ENV_VARS.SURREAL_PASSWORD} is missing`
    );
  }

  if (!user && password) {
    throw new Error(
      `${ENV_VARS.SURREAL_PASSWORD} is set but ${ENV_VARS.SURREAL_USER} is missing`
    );
  }

  return {
    url,
    namespace,
    database,
    user,
    password,
  };
}

/**
 * Get the path to jdoc.json
 *
 * Checks environment variable TS_INTROSPECTION_JDOC_PATH first,
 * falls back to default path.
 *
 * @returns Absolute path to jdoc.json
 */
export function getJdocPath(): string {
  return process.env[ENV_VARS.JDOC_PATH] || DEFAULT_JDOC_PATH;
}

/**
 * Get the project root directory
 *
 * Checks environment variable TIDYSCRIPTS_HOME first,
 * falls back to default path.
 *
 * @returns Absolute path to project root
 */
export function getProjectRoot(): string {
  return process.env[ENV_VARS.PROJECT_ROOT] || DEFAULT_PROJECT_ROOT;
}

/**
 * Load complete introspection system configuration
 *
 * @returns Complete configuration object
 */
export function loadConfig(): IntrospectionConfig {
  return {
    jdocPath: getJdocPath(),
    surreal: loadSurrealConfig(),
  };
}

/**
 * Validate that OpenAI API key is available
 *
 * @returns true if OPENAI_API_KEY is set
 */
export function hasOpenAIKey(): boolean {
  return !!process.env[ENV_VARS.OPENAI_API_KEY];
}

/**
 * Get OpenAI API key from environment
 *
 * @returns OpenAI API key
 * @throws Error if OPENAI_API_KEY is not set
 */
export function getOpenAIKey(): string {
  const key = process.env[ENV_VARS.OPENAI_API_KEY];
  if (!key) {
    throw new Error(
      `${ENV_VARS.OPENAI_API_KEY} environment variable is not set. ` +
      `Please set it to your OpenAI API key to enable embedding generation.`
    );
  }
  return key;
}

// ============================================================================
// Configuration Validation
// ============================================================================

/**
 * Validate that all required configuration is available
 *
 * @param requireOpenAI - Whether to require OpenAI API key (default: true)
 * @throws Error if configuration is invalid or missing
 */
export function validateConfig(requireOpenAI: boolean = true): void {
  // Validate SurrealDB config
  const surrealConfig = loadSurrealConfig();

  if (!surrealConfig.url) {
    throw new Error('SurrealDB URL is not configured');
  }

  if (!surrealConfig.namespace) {
    throw new Error('SurrealDB namespace is not configured');
  }

  if (!surrealConfig.database) {
    throw new Error('SurrealDB database is not configured');
  }

  // Validate jdoc path
  const jdocPath = getJdocPath();
  if (!jdocPath) {
    throw new Error('jdoc.json path is not configured');
  }

  // Validate OpenAI key if required
  if (requireOpenAI && !hasOpenAIKey()) {
    throw new Error(
      `${ENV_VARS.OPENAI_API_KEY} is required for embedding generation. ` +
      `Please set this environment variable to your OpenAI API key.`
    );
  }
}

// ============================================================================
// Configuration Display
// ============================================================================

/**
 * Get a human-readable summary of the current configuration
 * (with sensitive values masked)
 *
 * @returns Configuration summary string
 */
export function getConfigSummary(): string {
  const config = loadConfig();
  const hasKey = hasOpenAIKey();

  const lines = [
    '=== Introspection System Configuration ===',
    '',
    'SurrealDB:',
    `  URL: ${config.surreal.url}`,
    `  Namespace: ${config.surreal.namespace}`,
    `  Database: ${config.surreal.database}`,
    `  User: ${config.surreal.user || '(none)'}`,
    `  Password: ${config.surreal.password ? '***' : '(none)'}`,
    '',
    'Files:',
    `  jdoc.json: ${config.jdocPath}`,
    '',
    'OpenAI:',
    `  API Key: ${hasKey ? '*** (set)' : '(not set)'}`,
    '',
  ];

  return lines.join('\n');
}

// ============================================================================
// Runtime Configuration Override
// ============================================================================

/**
 * Runtime configuration overrides (for testing)
 */
let configOverrides: Partial<IntrospectionConfig> | null = null;

/**
 * Set configuration overrides (useful for testing)
 *
 * @param overrides - Partial configuration to override defaults
 */
export function setConfigOverrides(overrides: Partial<IntrospectionConfig>): void {
  configOverrides = overrides;
}

/**
 * Clear configuration overrides
 */
export function clearConfigOverrides(): void {
  configOverrides = null;
}

/**
 * Get configuration with overrides applied
 *
 * @returns Configuration with any overrides applied
 */
export function getConfigWithOverrides(): IntrospectionConfig {
  const baseConfig = loadConfig();

  if (!configOverrides) {
    return baseConfig;
  }

  return {
    ...baseConfig,
    ...configOverrides,
    surreal: {
      ...baseConfig.surreal,
      ...(configOverrides.surreal || {}),
    },
  };
}
