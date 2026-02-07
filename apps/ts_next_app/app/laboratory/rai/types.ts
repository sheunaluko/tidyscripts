// RAI App TypeScript Type Definitions

export type ViewType = 'template_picker' | 'information_input' | 'note_generator' | 'template_editor' | 'settings' | 'test_interface' | 'manual';

export type Provider = 'anthropic' | 'gemini' | 'openai';

// Route types for hash-based routing
export interface Route {
  view: ViewType;
  params?: Record<string, string>;
}

export interface ParsedRoute {
  view: ViewType;
  params: Record<string, string>;
  mode?: 'list' | 'create' | 'edit';
  isValid: boolean;
  error?: string;
}

// App Settings
export interface AppSettings {
  inputMode: 'voice' | 'text';
  aiModel: string;                    // Model for note generation
  agentModel: string;                 // Model for voice agent conversation
  autostartAgent: boolean;
  autostartGeneration: boolean;
  showDefaultTemplates: boolean;
  advancedFeaturesEnabled: boolean;
  positiveSpeechThreshold: number;    // VAD positive speech threshold (0.0-1.0)
  negativeSpeechThreshold: number;    // VAD negative (silence) threshold (0.0-1.0)
  minSpeechStartMs: number;           // Minimum speech duration before triggering (ms)
  powerThreshold: number;             // Audio power threshold for responsive mode
  enableInterruption: boolean;        // Allow voice interruption of TTS
  useUnstructuredMode?: boolean;      // Toggle between structured/unstructured LLM calls
  tiviMode: 'guarded' | 'responsive' | 'continuous';  // Voice recognition mode
  playbackRate: number;               // TTS playback rate (1.0 = normal)
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
  id: string;
  text: string;
  timestamp: Date;
  suggestedVariable?: string | null; // Template variable this information maps to (optional)
}

// Voice Agent Transcript
export interface TranscriptEntry {
  timestamp: Date;
  speaker: 'user' | 'agent' | 'system';
  text: string;
}

// Tool Call Thoughts (for dev tools)
export interface ToolCallThought {
  timestamp: Date;
  toolName: string;
  thoughts: string;
  parameters?: Record<string, any>;
}

// Test Interface - Model Test Result
export interface ModelTestResult {
  model: string;
  status: 'pending' | 'running' | 'success' | 'error';
  note: string | null;
  error: string | null;
  startTime: Date | null;
  endTime: Date | null;
  duration: number | null; // milliseconds
}

// Test Interface - Complete Test Run
export interface TestRun {
  id: string; // UUID
  hash: string; // SHA-256 of template + input
  templateId: string;
  templateTitle: string;
  templateContent: string;
  inputText: string;
  models: string[]; // Models selected for this run
  results: ModelTestResult[];
  createdAt: Date;
  analysis: {
    modelUsed: string;
    content: string;
    timestamp: Date;
  } | null;
}

// Dot Phrase
export interface DotPhrase {
  id: string;
  title: string;              // Display title (e.g., "HPI Differential")
  titleNormalized: string;    // Normalized for matching (e.g., "HPI-DIFFERENTIAL")
  phrase: string;             // The replacement text
  description?: string;       // Optional description (shown first in UI)
  createdAt: Date;
  updatedAt: Date;
}

// Note Checkpoint - tracks editing history
export interface NoteCheckpoint {
  id: string;
  content: string;
  timestamp: Date;
  type: 'user_edit' | 'transformation' | 'checkpoint_navigation';
  // Navigation-specific metadata (only for checkpoint_navigation type)
  targetCheckpointId?: string; // Reference to accepted checkpoint
}

// Zustand Store State
export interface RaiState {
  // Navigation
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;

  // Routing
  isRoutingEnabled: boolean;
  setRoutingEnabled: (enabled: boolean) => void;
  applyRoute: (hash: string) => void;
  syncRouteFromState: () => void;

  // Templates
  templates: NoteTemplate[];
  selectedTemplateId: string | null;
  setSelectedTemplate: (template: NoteTemplate) => void;
  loadTemplates: () => Promise<void>;

  // Template Editor
  customTemplates: NoteTemplate[];
  templateEditorMode: 'list' | 'create' | 'edit';
  editingTemplateId: string | null;
  createCustomTemplate: (data: Omit<NoteTemplate, 'id' | 'variables' | 'isDefault' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateCustomTemplate: (id: string, updates: Partial<NoteTemplate>) => Promise<void>;
  deleteCustomTemplate: (id: string) => Promise<void>;
  loadCustomTemplates: () => Promise<void>;
  saveCustomTemplates: () => Promise<void>;
  setTemplateEditorMode: (mode: 'list' | 'create' | 'edit') => void;
  setEditingTemplate: (template: NoteTemplate | null) => void;

  // Information Collection (free text approach)
  collectedInformation: InformationEntry[];
  addInformationText: (text: string, suggestedVariable?: string | null) => void;
  updateInformationText: (id: string, newText: string, suggestedVariable?: string | null) => void;
  deleteInformationEntry: (id: string) => void;
  resetInformation: () => void;
  informationComplete: boolean;
  setInformationComplete: (complete: boolean) => void;

  // Voice Agent State
  voiceAgentConnected: boolean;
  voiceAgentTranscript: TranscriptEntry[];
  toolCallThoughts: ToolCallThought[];
  setVoiceAgentConnected: (connected: boolean) => void;
  addTranscriptEntry: (entry: TranscriptEntry) => void;
  clearTranscript: () => void;
  addToolCallThought: (thought: ToolCallThought) => void;
  clearToolCallThoughts: () => void;

  // Review State (for "finished" keyword review flow)
  reviewPending: boolean;
  setReviewPending: (pending: boolean) => void;
  reviewMessage: string | null;
  setReviewMessage: (message: string | null) => void;

  // Note Generation
  generatedNote: string | null;
  noteGenerationLoading: boolean;
  noteGenerationError: string | null;
  setGeneratedNote: (note: string) => void;
  setNoteGenerationLoading: (loading: boolean) => void;
  setNoteGenerationError: (error: string | null) => void;

  // Note Checkpoints - Dual Tracking System
  // Analytics Checkpoints - append-only, captures everything
  analyticsCheckpoints: NoteCheckpoint[];
  addAnalyticsCheckpoint: (content: string, type: 'user_edit' | 'transformation' | 'checkpoint_navigation', metadata?: { targetCheckpointId?: string }) => void;

  // UI Checkpoints - mutable, for navigation
  uiCheckpoints: NoteCheckpoint[];
  currentCheckpointIndex: number; // -1 means live editing, 0+ means browsing
  isBrowsingCheckpoints: boolean; // true when in browse mode (back button clicked)
  navigateCheckpoint: (direction: 'back' | 'forward') => void; // Browse without logging
  acceptCheckpoint: () => void; // Accept current checkpoint, log to analytics, discard forward history
  clearAllCheckpoints: () => void;

  // Settings
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  loadSettings: (insights?: any) => Promise<void>;
  saveSettings: () => Promise<void>;

  // Test Interface
  selectedTemplateForTestId: string | null;
  testInputText: string;
  selectedModels: string[];
  currentTestRun: TestRun | null;
  isRunningTest: boolean;
  testHistory: TestRun[];
  analysisModel: string;
  isAnalyzing: boolean;
  setSelectedTemplateForTest: (template: NoteTemplate | null) => void;
  setTestInputText: (text: string) => void;
  setSelectedModels: (models: string[]) => void;
  setAnalysisModel: (model: string) => void;
  startTest: () => Promise<void>;
  analyzeResults: (testRunId: string) => Promise<void>;
  loadTestHistory: () => Promise<void>;
  saveTestHistory: () => Promise<void>;
  loadTestRun: (testRunId: string) => void;
  deleteTestRun: (testRunId: string) => void;

  // Dot Phrases
  dotPhrases: DotPhrase[];
  createDotPhrase: (title: string, phrase: string, description?: string) => void;
  updateDotPhrase: (id: string, updates: Partial<DotPhrase>) => void;
  deleteDotPhrase: (id: string) => void;
  loadDotPhrases: () => Promise<void>;
  saveDotPhrases: () => Promise<void>;
}
