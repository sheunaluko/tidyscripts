// Derived selector hooks for ID-based template state
// These hooks look up full NoteTemplate objects from the templates array,
// ensuring consumers always get fresh data after edits/reloads.

import { useRaiStore } from '../store/useRaiStore';
import { NoteTemplate } from '../types';

export function useSelectedTemplate(): NoteTemplate | null {
  return useRaiStore(s => {
    if (!s.selectedTemplateId) return null;
    return s.templates.find(t => t.id === s.selectedTemplateId) ?? null;
  });
}

export function useEditingTemplate(): NoteTemplate | null {
  return useRaiStore(s => {
    if (!s.editingTemplateId) return null;
    return s.templates.find(t => t.id === s.editingTemplateId) ?? null;
  });
}

export function useSelectedTemplateForTest(): NoteTemplate | null {
  return useRaiStore(s => {
    if (!s.selectedTemplateForTestId) return null;
    return s.templates.find(t => t.id === s.selectedTemplateForTestId) ?? null;
  });
}
