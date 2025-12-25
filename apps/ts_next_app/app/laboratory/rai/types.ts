// RAI App TypeScript Type Definitions

export type ViewType = 'template_picker' | 'information_input' | 'note_generator' | 'template_editor' | 'settings';

export type Provider = 'anthropic' | 'gemini' | 'openai';

// App Settings
export interface AppSettings {
  inputMode: 'voice' | 'text';
  aiModel: string;
  autostartAgent: boolean;
  autostartGeneration: boolean;
  showDefaultTemplates: boolean;
}

// Note Template
export interface NoteTemplate {
  id: string;
  title: string;
  description: string;
  template: string; // Full template text with {{VARIABLE_NAME}} placeholders
  variables: string[]; // Extracted variable names from template
  isDefault?: boolean; // Mark default (file-based) templates
  createdAt?: Date; // Timestamp for custom templates
  updatedAt?: Date; // Last update timestamp for custom templates
}

// Information Entry (free text approach)
export interface InformationEntry {
  text: string;
  timestamp: Date;
}

// Voice Agent Transcript
export interface TranscriptEntry {
  timestamp: Date;
  speaker: 'user' | 'agent' | 'system';
  text: string;
}

// Zustand Store State
export interface RaiState {
  // Navigation
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;

  // Templates
  templates: NoteTemplate[];
  selectedTemplate: NoteTemplate | null;
  setSelectedTemplate: (template: NoteTemplate) => void;
  loadTemplates: () => Promise<void>;

  // Template Editor
  customTemplates: NoteTemplate[];
  templateEditorMode: 'list' | 'create' | 'edit';
  editingTemplate: NoteTemplate | null;
  createCustomTemplate: (data: Omit<NoteTemplate, 'id' | 'variables' | 'isDefault' | 'createdAt' | 'updatedAt'>) => void;
  updateCustomTemplate: (id: string, updates: Partial<NoteTemplate>) => void;
  deleteCustomTemplate: (id: string) => void;
  loadCustomTemplates: () => void;
  saveCustomTemplates: () => void;
  setTemplateEditorMode: (mode: 'list' | 'create' | 'edit') => void;
  setEditingTemplate: (template: NoteTemplate | null) => void;

  // Information Collection (free text approach)
  collectedInformation: InformationEntry[];
  addInformationText: (text: string) => void;
  resetInformation: () => void;
  informationComplete: boolean;
  setInformationComplete: (complete: boolean) => void;

  // Voice Agent State
  voiceAgentConnected: boolean;
  voiceAgentTranscript: TranscriptEntry[];
  setVoiceAgentConnected: (connected: boolean) => void;
  addTranscriptEntry: (entry: TranscriptEntry) => void;
  clearTranscript: () => void;

  // Note Generation
  generatedNote: string | null;
  noteGenerationLoading: boolean;
  noteGenerationError: string | null;
  setGeneratedNote: (note: string) => void;
  setNoteGenerationLoading: (loading: boolean) => void;
  setNoteGenerationError: (error: string | null) => void;

  // Settings
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  loadSettings: () => void;
  saveSettings: () => void;
}
