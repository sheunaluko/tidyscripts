// useTemplates Hook - Convenience hook for template operations

import { useRaiStore } from '../store/useRaiStore';
import { useSelectedTemplate } from './useTemplateLookups';

/**
 * Hook to access template-related state and operations
 */
export function useTemplates() {
  const templates = useRaiStore((state) => state.templates);
  const selectedTemplate = useSelectedTemplate();
  const setSelectedTemplate = useRaiStore((state) => state.setSelectedTemplate);
  const loadTemplates = useRaiStore((state) => state.loadTemplates);

  return {
    templates,
    selectedTemplate,
    setSelectedTemplate,
    loadTemplates,
  };
}
