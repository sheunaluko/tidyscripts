// RAI App Zustand Store

import { create } from 'zustand';
import * as tsw from 'tidyscripts_web';
import { RaiState, ViewType, NoteTemplate, InformationEntry, TranscriptEntry, AppSettings } from '../types';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from '../constants';
import { loadTemplates as loadTemplatesFromFiles } from '../lib/templateParser';

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
      const templates = loadTemplatesFromFiles();
      log(`Templates loaded: ${templates.length}`);
      set({ templates });
      log('Templates set in state');
    } catch (error) {
      log('Error in loadTemplates:');
      log(String(error));
    }
  },

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
}));
