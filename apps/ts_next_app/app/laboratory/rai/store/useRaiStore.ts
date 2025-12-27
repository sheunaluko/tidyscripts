// RAI App Zustand Store

import { create } from 'zustand';
import * as tsw from 'tidyscripts_web';
import { RaiState, ViewType, NoteTemplate, InformationEntry, TranscriptEntry, ToolCallThought, AppSettings, TestRun, ModelTestResult, DotPhrase, NoteCheckpoint } from '../types';
import { DEFAULT_SETTINGS, STORAGE_KEYS, SUPPORTED_MODELS, TEMPLATE_SYNTAX } from '../constants';
import {
  loadTemplates as loadTemplatesFromFiles,
  loadCustomTemplatesFromStorage,
  extractVariables,
  generateCustomTemplateId,
  normalizeDotPhraseTitle,
  generateDotPhraseId,
  loadDotPhrasesFromStorage,
} from '../lib/templateParser';
import { generateTestHash, findCachedResults, mergeWithCache, runParallelTest } from '../lib/testRunner';
import { buildAnalysisPrompt } from '../prompts/result_analysis_prompt';
import { NOTE_GENERATION_SYSTEM_PROMPT } from '../prompts/note_generation_prompt';
import { generateNote } from '../lib/noteGenerator';
import { parseHash, generateHash, updateHash } from '../lib/router';

const log = tsw.common.logger.get_logger({ id: 'rai' });
const debug = tsw.common.util.debug;

export const useRaiStore = create<RaiState>((set, get) => ({
  // Navigation
  currentView: 'template_picker' as ViewType,
  setCurrentView: (view: ViewType) => {
    debug.add('view_changed', { from: get().currentView, to: view });
    set({ currentView: view });

    // Sync route after state update
    setTimeout(() => get().syncRouteFromState(), 0);
  },

  // Routing
  isRoutingEnabled: false,

  setRoutingEnabled: (enabled: boolean) => {
    set({ isRoutingEnabled: enabled });
    debug.add('routing_enabled_changed', { enabled });
  },

  applyRoute: (hash: string) => {
    const { isRoutingEnabled, isRunningTest } = get();

    // Don't navigate if test is running
    if (isRunningTest) {
      log('Cannot navigate during active test run');
      console.warn('[RAI Router] Navigation blocked during active test run');
      return;
    }

    if (!isRoutingEnabled) return;

    log(`Applying route from hash: "${hash}"`);

    const parsed = parseHash(hash);

    // Handle invalid routes
    if (!parsed.isValid) {
      log(`Invalid route: ${parsed.error}`);
      console.warn(`[RAI Router] Invalid route: ${parsed.error}, redirecting to templates`);

      // Redirect to safe view
      set({ currentView: 'template_picker' });
      updateHash('templates');
      return;
    }

    // Apply view
    const currentView = get().currentView;
    if (currentView !== parsed.view) {
      set({ currentView: parsed.view });
    }

    // Apply view-specific state
    switch (parsed.view) {
      case 'template_editor':
        if (parsed.mode) {
          set({ templateEditorMode: parsed.mode });

          // Load template for edit mode
          if (parsed.mode === 'edit' && parsed.params.templateId) {
            const template = get().templates.find(
              t => t.id === parsed.params.templateId
            );

            if (template) {
              set({ editingTemplate: template });
            } else {
              log(`Template not found: ${parsed.params.templateId}, redirecting to list`);
              set({
                templateEditorMode: 'list',
                editingTemplate: null
              });
              updateHash('templates/edit');
            }
          } else if (parsed.mode === 'create') {
            set({ editingTemplate: null });
          }
        }
        break;

      case 'test_interface':
        // Load test run if runId specified
        if (parsed.params.runId) {
          const testRun = get().testHistory.find(
            run => run.id === parsed.params.runId
          );

          if (testRun) {
            get().loadTestRun(parsed.params.runId);
          } else {
            log(`Test run not found: ${parsed.params.runId}, redirecting to test base`);
            set({ currentTestRun: null });
            updateHash('test');
          }
        } else {
          // Clear current test run if going to base test view
          // (unless actively running a test)
          if (!get().isRunningTest) {
            set({ currentTestRun: null });
          }
        }
        break;
    }

    debug.add('route_applied', { view: parsed.view, params: parsed.params });
  },

  syncRouteFromState: () => {
    const { isRoutingEnabled } = get();
    if (!isRoutingEnabled) return;

    const {
      currentView,
      templateEditorMode,
      editingTemplate,
      currentTestRun,
    } = get();

    const hash = generateHash(currentView, {
      templateEditorMode,
      templateId: editingTemplate?.id,
      testRunId: currentTestRun?.id,
    });

    updateHash(hash);
    debug.add('route_synced', { view: currentView, hash });
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

  // Dot Phrases
  dotPhrases: [],

  // Information Collection (free text approach)
  collectedInformation: [],
  addInformationText: (text: string, suggestedVariable?: string | null) => {
    const entry: InformationEntry = {
      id: crypto.randomUUID(),
      text,
      timestamp: new Date(),
      suggestedVariable,
    };
    debug.add('information_entry_added', entry);
    set((state) => ({
      collectedInformation: [...state.collectedInformation, entry],
    }));
  },
  updateInformationText: (id: string, newText: string, suggestedVariable?: string | null) => {
    debug.add('information_entry_updated', { id, newText, suggestedVariable });
    set((state) => ({
      collectedInformation: state.collectedInformation.map((entry) =>
        entry.id === id ? { ...entry, text: newText, suggestedVariable } : entry
      ),
    }));
  },
  deleteInformationEntry: (id: string) => {
    debug.add('information_entry_deleted', { id });
    set((state) => ({
      collectedInformation: state.collectedInformation.filter((entry) => entry.id !== id),
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
  toolCallThoughts: [],
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
  addToolCallThought: (thought: ToolCallThought) => {
    debug.add('tool_call_thought_added', thought);
    set((state) => ({
      toolCallThoughts: [...state.toolCallThoughts, thought],
    }));
  },
  clearToolCallThoughts: () => {
    debug.add('tool_call_thoughts_cleared', {});
    set({ toolCallThoughts: [] });
  },

  // Note Generation
  generatedNote: null,
  noteGenerationLoading: false,
  noteGenerationError: null,
  setGeneratedNote: (note: string) => {
    debug.add('generated_note', { noteLength: note.length });
    set({ generatedNote: note, noteGenerationError: null });
    // Clear all checkpoints when a new note is generated
    get().clearAllCheckpoints();
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

  // Note Checkpoints - Dual Tracking System
  // Analytics Checkpoints - append-only, never delete
  analyticsCheckpoints: [],
  addAnalyticsCheckpoint: (content: string, type: 'user_edit' | 'transformation' | 'checkpoint_navigation', metadata?: { targetCheckpointId?: string }) => {
    const checkpoints = get().analyticsCheckpoints;

    // Deduplicate: skip if same as last checkpoint (unless it's a navigation event)
    const lastCheckpoint = checkpoints[checkpoints.length - 1];
    if (type !== 'checkpoint_navigation' && lastCheckpoint && lastCheckpoint.content === content) {
      return;
    }

    const checkpoint: NoteCheckpoint = {
      id: crypto.randomUUID(),
      content,
      timestamp: new Date(),
      type,
      ...metadata, // Spread targetCheckpointId if provided
    };

    set({ analyticsCheckpoints: [...checkpoints, checkpoint] });
    debug.add('analytics_checkpoint_added', {
      type,
      checkpointCount: checkpoints.length + 1,
      contentLength: content.length,
      ...metadata,
    });
  },

  // UI Checkpoints - mutable, for navigation
  uiCheckpoints: [],
  currentCheckpointIndex: -1, // -1 = live editing, 0+ = browsing
  isBrowsingCheckpoints: false, // true when in browse mode

  navigateCheckpoint: (direction: 'back' | 'forward') => {
    const { uiCheckpoints, currentCheckpointIndex } = get();

    if (uiCheckpoints.length === 0) return;

    let newIndex: number;

    if (direction === 'back') {
      // Navigate backwards
      if (currentCheckpointIndex === -1) {
        // Currently in live editing, enter browse mode at last checkpoint
        newIndex = uiCheckpoints.length - 1;
        set({ isBrowsingCheckpoints: true });
      } else if (currentCheckpointIndex > 0) {
        // Go back one step
        newIndex = currentCheckpointIndex - 1;
      } else {
        // Already at oldest checkpoint
        return;
      }
    } else {
      // Navigate forwards
      if (currentCheckpointIndex === -1) {
        // Already in live editing mode
        return;
      } else if (currentCheckpointIndex < uiCheckpoints.length - 1) {
        // Go forward one step
        newIndex = currentCheckpointIndex + 1;
      } else {
        // At newest checkpoint, can't go further forward
        return;
      }
    }

    set({ currentCheckpointIndex: newIndex });

    debug.add('checkpoint_browsed', {
      direction,
      newIndex,
      checkpointId: uiCheckpoints[newIndex].id,
    });
  },

  acceptCheckpoint: () => {
    const { uiCheckpoints, currentCheckpointIndex, addAnalyticsCheckpoint } = get();

    if (currentCheckpointIndex === -1 || uiCheckpoints.length === 0) {
      // Not in browse mode, nothing to accept
      return;
    }

    const acceptedCheckpoint = uiCheckpoints[currentCheckpointIndex];

    // Log to analytics - this is the ONLY place checkpoint_navigation is logged
    addAnalyticsCheckpoint(
      acceptedCheckpoint.content,
      'checkpoint_navigation',
      {
        targetCheckpointId: acceptedCheckpoint.id,
      }
    );

    // Discard forward history: keep checkpoints up to and including current
    const newUiCheckpoints = uiCheckpoints.slice(0, currentCheckpointIndex + 1);

    // Exit browse mode, return to live editing
    set({
      uiCheckpoints: newUiCheckpoints,
      currentCheckpointIndex: -1,
      isBrowsingCheckpoints: false,
    });

    debug.add('checkpoint_accepted', {
      checkpointId: acceptedCheckpoint.id,
      discardedCount: uiCheckpoints.length - currentCheckpointIndex - 1,
    });
  },

  clearAllCheckpoints: () => {
    const analyticsCount = get().analyticsCheckpoints.length;
    const uiCount = get().uiCheckpoints.length;

    set({
      analyticsCheckpoints: [],
      uiCheckpoints: [],
      currentCheckpointIndex: -1,
      isBrowsingCheckpoints: false,
    });

    debug.add('all_checkpoints_cleared', { analyticsCount, uiCount });
    log(`Cleared ${analyticsCount} analytics checkpoints and ${uiCount} UI checkpoints`);
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

  // Dot Phrase CRUD operations
  createDotPhrase: (title: string, phrase: string) => {
    const titleNormalized = normalizeDotPhraseTitle(title);
    const newDotPhrase: DotPhrase = {
      id: generateDotPhraseId(),
      title,
      titleNormalized,
      phrase,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    set({ dotPhrases: [...get().dotPhrases, newDotPhrase] });
    get().saveDotPhrases();
    debug.add('dot_phrase_created', { title: titleNormalized });
    log(`Created dot phrase: .${titleNormalized}`);
  },

  updateDotPhrase: (id: string, updates: Partial<DotPhrase>) => {
    const dotPhrases = get().dotPhrases.map(dp =>
      dp.id === id
        ? {
            ...dp,
            ...updates,
            titleNormalized: updates.title
              ? normalizeDotPhraseTitle(updates.title)
              : dp.titleNormalized,
            updatedAt: new Date(),
          }
        : dp
    );

    set({ dotPhrases });
    get().saveDotPhrases();
    debug.add('dot_phrase_updated', { id });
    log(`Updated dot phrase: ${id}`);
  },

  deleteDotPhrase: (id: string) => {
    set({ dotPhrases: get().dotPhrases.filter(dp => dp.id !== id) });
    get().saveDotPhrases();
    debug.add('dot_phrase_deleted', { id });
    log(`Deleted dot phrase: ${id}`);
  },

  loadDotPhrases: () => {
    try {
      const dotPhrases = loadDotPhrasesFromStorage();
      set({ dotPhrases });
      debug.add('dot_phrases_loaded', { count: dotPhrases.length });
      log(`Loaded ${dotPhrases.length} dot phrases from localStorage`);
    } catch (error) {
      log('Error loading dot phrases:');
      log(error);
      set({ dotPhrases: [] });
    }
  },

  saveDotPhrases: () => {
    try {
      const dotPhrases = get().dotPhrases.map(dp => ({
        id: dp.id,
        title: dp.title,
        titleNormalized: dp.titleNormalized,
        phrase: dp.phrase,
        createdAt: dp.createdAt.toISOString(),
        updatedAt: dp.updatedAt.toISOString(),
      }));
      localStorage.setItem(STORAGE_KEYS.dotPhrases, JSON.stringify(dotPhrases));
      debug.add('dot_phrases_saved', { count: dotPhrases.length });
      log(`Saved ${dotPhrases.length} dot phrases to localStorage`);
    } catch (error) {
      log('Error saving dot phrases:');
      log(error);
    }
  },

  setTemplateEditorMode: (mode) => {
    set({ templateEditorMode: mode });
    debug.add('template_editor_mode_changed', { mode });

    // Sync route after state update
    setTimeout(() => get().syncRouteFromState(), 0);
  },

  setEditingTemplate: (template) => {
    set({ editingTemplate: template });
    debug.add('editing_template_set', { templateId: template?.id });

    // Sync route after state update
    setTimeout(() => get().syncRouteFromState(), 0);
  },

  // Test Interface
  selectedTemplateForTest: null,
  testInputText: '',
  selectedModels: [...SUPPORTED_MODELS], // Default: all models selected
  currentTestRun: null,
  isRunningTest: false,
  testHistory: [],
  analysisModel: DEFAULT_SETTINGS.aiModel,
  isAnalyzing: false,

  setSelectedTemplateForTest: (template) => {
    set({ selectedTemplateForTest: template });
    debug.add('test_template_selected', { templateId: template?.id });
  },

  setTestInputText: (text) => {
    set({ testInputText: text });
  },

  setSelectedModels: (models) => {
    set({ selectedModels: models });
    debug.add('test_models_selected', { count: models.length });
  },

  setAnalysisModel: (model) => {
    set({ analysisModel: model });
    debug.add('analysis_model_selected', { model });
  },

  startTest: async () => {
    const {
      selectedTemplateForTest,
      testInputText,
      selectedModels,
      testHistory,
    } = get();

    if (!selectedTemplateForTest || !testInputText.trim() || selectedModels.length === 0) {
      log('Cannot start test: missing template, input, or models');
      return;
    }

    set({ isRunningTest: true });
    debug.add('test_started', {
      templateId: selectedTemplateForTest.id,
      inputLength: testInputText.length,
      models: selectedModels.length,
    });

    try {
      // Generate hash
      const hash = await generateTestHash(
        selectedTemplateForTest.template,
        testInputText
      );

      log({ msg: 'Test hash generated', hash: hash.substring(0, 16) + '...' });

      // Check cache
      const cached = findCachedResults(hash, testHistory);
      const { toRun, cached: cachedResults } = mergeWithCache(selectedModels, cached);

      log({
        msg: 'Cache check complete',
        cached: cachedResults.length,
        toRun: toRun.length,
      });

      // Create test run
      const testRun: TestRun = {
        id: crypto.randomUUID(),
        hash,
        templateId: selectedTemplateForTest.id,
        templateTitle: selectedTemplateForTest.title,
        templateContent: selectedTemplateForTest.template,
        inputText: testInputText,
        models: selectedModels,
        results: [...cachedResults],
        createdAt: new Date(),
        analysis: null,
      };

      set({ currentTestRun: testRun });

      // Run tests for non-cached models
      if (toRun.length > 0) {
        await runParallelTest(
          selectedTemplateForTest.template,
          testInputText,
          toRun,
          NOTE_GENERATION_SYSTEM_PROMPT,
          (result: ModelTestResult) => {
            // Update progress in real-time
            const current = get().currentTestRun;
            if (current) {
              const updatedResults = [...current.results];
              const idx = updatedResults.findIndex(r => r.model === result.model);
              if (idx >= 0) {
                updatedResults[idx] = result;
              } else {
                updatedResults.push(result);
              }

              set({
                currentTestRun: { ...current, results: updatedResults },
              });
            }
          }
        );
      }

      // Save to history
      const finalTestRun = get().currentTestRun;
      if (finalTestRun) {
        const updatedHistory = [finalTestRun, ...get().testHistory].slice(0, 50); // Keep last 50
        set({ testHistory: updatedHistory });
        get().saveTestHistory();

        debug.add('test_completed', {
          testId: finalTestRun.id,
          success: finalTestRun.results.filter(r => r.status === 'success').length,
          error: finalTestRun.results.filter(r => r.status === 'error').length,
        });
      }
    } catch (error) {
      log({ msg: 'Test execution error', error });
    } finally {
      set({ isRunningTest: false });
    }
  },

  analyzeResults: async (testRunId: string) => {
    const { testHistory, analysisModel } = get();
    const testRun = testRunId === get().currentTestRun?.id
      ? get().currentTestRun
      : testHistory.find(run => run.id === testRunId);

    if (!testRun || testRun.results.length === 0) {
      log('Cannot analyze: no test run or results');
      return;
    }

    set({ isAnalyzing: true });
    debug.add('analysis_started', { testRunId, analysisModel });

    try {
      // Build analysis prompt with all context
      const { system, user } = buildAnalysisPrompt(
        TEMPLATE_SYNTAX,
        NOTE_GENERATION_SYSTEM_PROMPT,
        testRun.templateContent,
        testRun.inputText,
        testRun.results
      );

      log({ msg: 'Analysis prompt built', systemLength: system.length, userLength: user.length });

      // Call LLM for analysis
      // Use generateNote with analysis prompt as template and user prompt as input
      const analysisContent = await generateNote(
        analysisModel,
        system, // Use system prompt as template
        [user], // User prompt as input
        '', // Empty system prompt since we're using it as template
        3 // retries
      );

      // Update test run with analysis
      const analysisResult = {
        modelUsed: analysisModel,
        content: analysisContent,
        timestamp: new Date(),
      };

      // Update current test run if it matches
      if (get().currentTestRun?.id === testRunId) {
        set({
          currentTestRun: {
            ...get().currentTestRun!,
            analysis: analysisResult,
          },
        });
      }

      // Update in history
      const updatedHistory = get().testHistory.map(run =>
        run.id === testRunId
          ? { ...run, analysis: analysisResult }
          : run
      );
      set({ testHistory: updatedHistory });
      get().saveTestHistory();

      debug.add('analysis_completed', { testRunId });
      log({ msg: 'Analysis completed', length: analysisContent.length });
    } catch (error) {
      log({ msg: 'Analysis error', error });
    } finally {
      set({ isAnalyzing: false });
    }
  },

  loadTestHistory: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.testRuns);
      if (stored) {
        const parsed = JSON.parse(stored);
        const history: TestRun[] = parsed.map((run: any) => ({
          ...run,
          createdAt: new Date(run.createdAt),
          results: run.results.map((r: any) => ({
            ...r,
            startTime: r.startTime ? new Date(r.startTime) : null,
            endTime: r.endTime ? new Date(r.endTime) : null,
          })),
          analysis: run.analysis ? {
            ...run.analysis,
            timestamp: new Date(run.analysis.timestamp),
          } : null,
        }));
        set({ testHistory: history });
        log({ msg: 'Test history loaded', count: history.length });
      }
    } catch (error) {
      log({ msg: 'Error loading test history', error });
    }
  },

  saveTestHistory: () => {
    try {
      const { testHistory } = get();
      const serialized = testHistory.map(run => ({
        ...run,
        createdAt: run.createdAt.toISOString(),
        results: run.results.map(r => ({
          ...r,
          startTime: r.startTime?.toISOString() || null,
          endTime: r.endTime?.toISOString() || null,
        })),
        analysis: run.analysis ? {
          ...run.analysis,
          timestamp: run.analysis.timestamp.toISOString(),
        } : null,
      }));
      localStorage.setItem(STORAGE_KEYS.testRuns, JSON.stringify(serialized));
      log({ msg: 'Test history saved', count: serialized.length });
    } catch (error) {
      log({ msg: 'Error saving test history', error });
    }
  },

  loadTestRun: (testRunId: string) => {
    const { testHistory } = get();
    const testRun = testHistory.find(run => run.id === testRunId);

    if (testRun) {
      // Load test run data into form
      const template = get().templates.find(t => t.id === testRun.templateId);
      set({
        selectedTemplateForTest: template || null,
        testInputText: testRun.inputText,
        selectedModels: testRun.models,
        currentTestRun: testRun,
      });
      debug.add('test_run_loaded', { testRunId });
      log({ msg: 'Test run loaded', testRunId });

      // Sync route after state update
      setTimeout(() => get().syncRouteFromState(), 0);
    }
  },

  deleteTestRun: (testRunId: string) => {
    const updatedHistory = get().testHistory.filter(run => run.id !== testRunId);
    set({ testHistory: updatedHistory });
    get().saveTestHistory();

    // Clear current test run if it was deleted
    if (get().currentTestRun?.id === testRunId) {
      set({ currentTestRun: null });
    }

    debug.add('test_run_deleted', { testRunId });
    log({ msg: 'Test run deleted', testRunId });
  },
}));
