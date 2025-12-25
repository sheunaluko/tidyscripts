// RAI App Zustand Store

import { create } from 'zustand';
import * as tsw from 'tidyscripts_web';
import { RaiState, ViewType, NoteTemplate, InformationEntry, TranscriptEntry, AppSettings } from '../types';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from '../constants';
import {
  loadTemplates as loadTemplatesFromFiles,
  loadCustomTemplatesFromStorage,
  extractVariables,
  generateCustomTemplateId,
} from '../lib/templateParser';

const log = tsw.common.logger.get_logger({ id: 'rai' });
const debug = tsw.common.util.debug;

export const useRaiStore = create<RaiState>((set, get) => ({
  // Navigation
  currentView: 'template_picker' as ViewType,
  setCurrentView: (view: ViewType) => {
    debug.add('view_changed', { from: get().currentView, to: view });
    set({ currentView: view });
  },

  // Templates
  templates: [],
  selectedTemplate: null,
  setSelectedTemplate: (template: NoteTemplate) => {
    debug.add('template_selected', template);
    set({ selectedTemplate: template });
  },
  loadTemplates: async () => {
    try {
      log('Loading templates...');

      // Load default templates from files
      const defaultTemplates = loadTemplatesFromFiles();
      defaultTemplates.forEach(t => t.isDefault = true);

      // Load custom templates from localStorage
      const customTemplates = loadCustomTemplatesFromStorage();

      // Merge: default templates first, then custom
      const allTemplates = [...defaultTemplates, ...customTemplates];

      log(`Templates loaded: ${defaultTemplates.length} default, ${customTemplates.length} custom`);
      set({
        templates: allTemplates,
        customTemplates: customTemplates,
      });
      log('Templates set in state');
    } catch (error) {
      log('Error in loadTemplates:');
      log(String(error));
    }
  },

  // Template Editor
  customTemplates: [],
  templateEditorMode: 'list' as 'list' | 'create' | 'edit',
  editingTemplate: null,

  // Information Collection (free text approach)
  collectedInformation: [],
  addInformationText: (text: string) => {
    const entry: InformationEntry = {
      text,
      timestamp: new Date(),
    };
    debug.add('information_entry_added', entry);
    set((state) => ({
      collectedInformation: [...state.collectedInformation, entry],
    }));
  },
  resetInformation: () => {
    debug.add('information_reset', {});
    set({
      collectedInformation: [],
      informationComplete: false,
    });
  },
  informationComplete: false,
  setInformationComplete: (complete: boolean) => {
    debug.add('information_complete_changed', { complete });
    set({ informationComplete: complete });
  },

  // Voice Agent State
  voiceAgentConnected: false,
  voiceAgentTranscript: [],
  setVoiceAgentConnected: (connected: boolean) => {
    debug.add('voice_agent_connected', { connected });
    set({ voiceAgentConnected: connected });
  },
  addTranscriptEntry: (entry: TranscriptEntry) => {
    debug.add('transcript_entry_added', entry);
    set((state) => ({
      voiceAgentTranscript: [...state.voiceAgentTranscript, entry],
    }));
  },
  clearTranscript: () => {
    debug.add('transcript_cleared', {});
    set({ voiceAgentTranscript: [] });
  },

  // Note Generation
  generatedNote: null,
  noteGenerationLoading: false,
  noteGenerationError: null,
  setGeneratedNote: (note: string) => {
    debug.add('generated_note', { noteLength: note.length });
    set({ generatedNote: note, noteGenerationError: null });
  },
  setNoteGenerationLoading: (loading: boolean) => {
    debug.add('note_generation_loading', { loading });
    set({ noteGenerationLoading: loading });
  },
  setNoteGenerationError: (error: string | null) => {
    if (error) {
      log('Note generation error:');
      log(error);
      debug.add('note_generation_error', { error });
    }
    set({ noteGenerationError: error });
  },

  // Settings
  settings: DEFAULT_SETTINGS,
  updateSettings: (newSettings: Partial<AppSettings>) => {
    const updated = { ...get().settings, ...newSettings };
    debug.add('settings_updated', updated);
    set({ settings: updated });
    get().saveSettings();
  },
  loadSettings: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.settings);
      if (stored) {
        const parsed = JSON.parse(stored);
        const merged = { ...DEFAULT_SETTINGS, ...parsed };
        debug.add('settings_loaded', merged);
        set({ settings: merged });
      } else {
        debug.add('settings_loaded_defaults', DEFAULT_SETTINGS);
        set({ settings: DEFAULT_SETTINGS });
      }
    } catch (error) {
      log('Error loading settings:');
      log(error);
      set({ settings: DEFAULT_SETTINGS });
    }
  },
  saveSettings: () => {
    try {
      const settings = get().settings;
      localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
      debug.add('settings_saved', settings);
    } catch (error) {
      log('Error saving settings:');
      log(error);
    }
  },

  // Template Editor CRUD Operations
  createCustomTemplate: (templateData) => {
    const newTemplate: NoteTemplate = {
      ...templateData,
      id: generateCustomTemplateId(),
      variables: extractVariables(templateData.template),
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const customTemplates = [...get().customTemplates, newTemplate];
    set({ customTemplates });
    get().saveCustomTemplates();
    get().loadTemplates(); // Refresh merged list

    debug.add('custom_template_created', { id: newTemplate.id, title: newTemplate.title });
    log(`Created custom template: ${newTemplate.title}`);
  },

  updateCustomTemplate: (id, updates) => {
    const customTemplates = get().customTemplates.map(t =>
      t.id === id
        ? {
            ...t,
            ...updates,
            variables: updates.template ? extractVariables(updates.template) : t.variables,
            updatedAt: new Date(),
          }
        : t
    );

    set({ customTemplates });
    get().saveCustomTemplates();
    get().loadTemplates(); // Refresh merged list

    debug.add('custom_template_updated', { id, updates });
    log(`Updated custom template: ${id}`);
  },

  deleteCustomTemplate: (id) => {
    const customTemplates = get().customTemplates.filter(t => t.id !== id);
    set({ customTemplates });
    get().saveCustomTemplates();
    get().loadTemplates(); // Refresh merged list

    // If deleting currently selected template, clear selection
    if (get().selectedTemplate?.id === id) {
      set({ selectedTemplate: null });
    }

    debug.add('custom_template_deleted', { id });
    log(`Deleted custom template: ${id}`);
  },

  loadCustomTemplates: () => {
    try {
      const customTemplates = loadCustomTemplatesFromStorage();
      set({ customTemplates });
      debug.add('custom_templates_loaded', { count: customTemplates.length });
    } catch (error) {
      log('Error loading custom templates:');
      log(error);
      set({ customTemplates: [] });
    }
  },

  saveCustomTemplates: () => {
    try {
      const templates = get().customTemplates.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        template: t.template,
        createdAt: t.createdAt?.toISOString(),
        updatedAt: t.updatedAt?.toISOString(),
      }));
      localStorage.setItem(STORAGE_KEYS.customTemplates, JSON.stringify(templates));
      debug.add('custom_templates_saved', { count: templates.length });
      log(`Saved ${templates.length} custom templates to localStorage`);
    } catch (error) {
      log('Error saving custom templates:');
      log(error);
    }
  },

  setTemplateEditorMode: (mode) => {
    set({ templateEditorMode: mode });
    debug.add('template_editor_mode_changed', { mode });
  },

  setEditingTemplate: (template) => {
    set({ editingTemplate: template });
    debug.add('editing_template_set', { templateId: template?.id });
  },
}));
