// RAI App Zustand Store — powered by createInsightStore

import * as tsw from 'tidyscripts_web';
import { createInsightStore } from '../../../../src/lib/createInsightStore';
import { RaiState, ViewType, NoteTemplate, InformationEntry, TranscriptEntry, ToolCallThought, AppSettings, TestRun, ModelTestResult, DotPhrase, NoteCheckpoint } from '../types';
import { DEFAULT_SETTINGS, SUPPORTED_MODELS, TEMPLATE_SYNTAX } from '../constants';
import {
  loadTemplates as loadTemplatesFromFiles,
  loadCustomTemplatesFromData,
  extractVariables,
  generateCustomTemplateId,
  normalizeDotPhraseTitle,
  generateDotPhraseId,
} from '../lib/templateParser';
import { getRaiStore, RAI_DATA_KEYS, migrateLegacyLocalStorage, migrateLocalToCloud } from '../lib/storage';
import { checkCloudAuth, notifyCloudAuthRequired, notifyTemplateSavedLocally, waitForFirebaseAuth } from '../lib/authCheck';
import { updateTiviSettings, getTiviSettings } from '../../components/tivi/lib/settings';
import { surreal_query } from '../../../../src/firebase_utils';
import { toast_toast } from '../../../../components/Toast';
import { generateTestHash, findCachedResults, mergeWithCache, runParallelTest } from '../lib/testRunner';
import { buildAnalysisPrompt } from '../prompts/result_analysis_prompt';
import { NOTE_GENERATION_SYSTEM_PROMPT } from '../prompts/note_generation_prompt';
import { callLLMDirect, generateNote as generateNoteAPI, generateNoteUnstructured } from '../lib/noteGenerator';
import { reviewTemplate } from '../lib/rai_agent_web';
import { parseHash, generateHash, updateHash } from '../lib/router';
import { raiWorkflows } from '../simi';

const log = tsw.common.logger.get_logger({ id: 'rai' });

export const useRaiStore = createInsightStore<RaiState>({
  appName: 'rai',
  silent: ['syncRouteFromState'],
  workflows: raiWorkflows,
  creator: (set, get, _api, insights) => ({
    // Navigation
    currentView: 'template_picker' as ViewType,
    setCurrentView: (view: ViewType) => {
      set({ currentView: view });

      // Sync route after state update
      setTimeout(() => get().syncRouteFromState(), 0);
    },

    // Routing
    isRoutingEnabled: false,

    setRoutingEnabled: (enabled: boolean) => {
      set({ isRoutingEnabled: enabled });
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
                set({ editingTemplateId: template.id });
              } else {
                log(`Template not found: ${parsed.params.templateId}, redirecting to list`);
                set({
                  templateEditorMode: 'list',
                  editingTemplateId: null
                });
                updateHash('templates/edit');
              }
            } else if (parsed.mode === 'create') {
              set({ editingTemplateId: null });
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
    },

    syncRouteFromState: () => {
      const { isRoutingEnabled } = get();
      if (!isRoutingEnabled) return;

      const {
        currentView,
        templateEditorMode,
        editingTemplateId,
        currentTestRun,
      } = get();

      const hash = generateHash(currentView, {
        templateEditorMode,
        templateId: editingTemplateId ?? undefined,
        testRunId: currentTestRun?.id,
      });

      updateHash(hash);
    },

    // Templates
    templates: [],
    selectedTemplateId: null,
    setSelectedTemplate: (template: NoteTemplate) => {
      set({ selectedTemplateId: template.id });
    },
    loadTemplates: async () => {
      try {
        log('Loading templates...');

        // Load default templates from files
        const defaultTemplates = loadTemplatesFromFiles();
        defaultTemplates.forEach(t => t.isDefault = true);

        // Load custom templates from AppDataStore
        const store = getRaiStore();
        const data = await store.get<any[]>(RAI_DATA_KEYS.customTemplates);
        const customTemplates = data ? loadCustomTemplatesFromData(data) : [];

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
    editingTemplateId: null as string | null,

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
      set((state) => ({
        collectedInformation: [...state.collectedInformation, entry],
      }));
    },
    updateInformationText: (id: string, newText: string, suggestedVariable?: string | null) => {
      set((state) => ({
        collectedInformation: state.collectedInformation.map((entry) =>
          entry.id === id ? { ...entry, text: newText, suggestedVariable } : entry
        ),
      }));
    },
    deleteInformationEntry: (id: string) => {
      set((state) => ({
        collectedInformation: state.collectedInformation.filter((entry) => entry.id !== id),
      }));
    },
    resetInformation: () => {
      set({
        collectedInformation: [],
        informationComplete: false,
      });
    },
    informationComplete: false,
    setInformationComplete: (complete: boolean) => {
      set({ informationComplete: complete });
    },

    // Voice Agent State
    voiceAgentConnected: false,
    voiceAgentTranscript: [],
    toolCallThoughts: [],
    setVoiceAgentConnected: (connected: boolean) => {
      set({ voiceAgentConnected: connected });
    },
    addTranscriptEntry: (entry: TranscriptEntry) => {
      set((state) => ({
        voiceAgentTranscript: [...state.voiceAgentTranscript, entry],
      }));
    },
    clearTranscript: () => {
      set({ voiceAgentTranscript: [] });
    },
    addToolCallThought: (thought: ToolCallThought) => {
      set((state) => ({
        toolCallThoughts: [...state.toolCallThoughts, thought],
      }));
    },
    clearToolCallThoughts: () => {
      set({ toolCallThoughts: [] });
    },

    // Review State
    reviewPending: false,
    setReviewPending: (pending: boolean) => {
      set({ reviewPending: pending });
    },
    reviewMessage: null,
    setReviewMessage: (message: string | null) => {
      set({ reviewMessage: message });
    },

    // Note Generation
    generatedNote: null,
    noteGenerationLoading: false,
    noteGenerationError: null,
    setGeneratedNote: (note: string) => {
      set({ generatedNote: note, noteGenerationError: null });
      // Clear all checkpoints when a new note is generated
      get().clearAllCheckpoints();
    },
    setNoteGenerationLoading: (loading: boolean) => {
      set({ noteGenerationLoading: loading });
    },
    setNoteGenerationError: (error: string | null) => {
      if (error) {
        log('Note generation error:');
        log(error);
      }
      set({ noteGenerationError: error });
    },

    // Note Generation Actions
    reviewing: false,

    generateNote: async () => {
      const { templates, selectedTemplateId, collectedInformation, settings } = get();
      const selectedTemplate = templates.find(t => t.id === selectedTemplateId) || null;

      if (!selectedTemplate) {
        get().setNoteGenerationError('No template selected');
        return;
      }

      if (collectedInformation.length === 0) {
        get().setNoteGenerationError('No information collected');
        return;
      }

      get().setNoteGenerationError(null);
      get().setReviewMessage(null);

      const collectedText = collectedInformation.map((entry) => {
        if (entry.suggestedVariable) {
          return `[${entry.suggestedVariable}] ${entry.text}`;
        }
        return entry.text;
      });

      const insightsClient = insights.getClient();

      // Review template requirements if @END_TEMPLATE exists
      if (selectedTemplate.template.includes('@END_TEMPLATE')) {
        set({ reviewing: true });
        const reviewStart = Date.now();
        try {
          const review = await reviewTemplate(
            selectedTemplate,
            collectedInformation,
            settings.agentModel,
            insightsClient
          );
          const latency_ms = Date.now() - reviewStart;

          insights.emit('template_review', {
            template_id: selectedTemplate.id,
            template_name: selectedTemplate.title,
            collected_text: collectedText,
            model: settings.agentModel,
            action: review.action,
            message: review.message || null,
            latency_ms,
          });

          if (review.action === 'user_message' && review.message) {
            set({ reviewing: false });
            get().setReviewMessage(review.message);
            return;
          }
        } catch (err) {
          log('Review failed, proceeding with generation: ' + err);
          insights.emit('template_review', {
            template_id: selectedTemplate.id,
            action: 'error',
            error: String(err),
            latency_ms: Date.now() - reviewStart,
          });
        }
        set({ reviewing: false });
      }

      // Review passed or no review needed — generate
      const doGenerate = async () => {
        const ic = insights.getClient();
        const note = settings.useUnstructuredMode
          ? await generateNoteUnstructured(
              settings.aiModel,
              selectedTemplate.template,
              collectedText,
              NOTE_GENERATION_SYSTEM_PROMPT
            )
          : await generateNoteAPI(
              settings.aiModel,
              selectedTemplate.template,
              collectedText,
              NOTE_GENERATION_SYSTEM_PROMPT,
              3,
              ic,
              { templateId: selectedTemplate.id, templateName: selectedTemplate.title }
            );
        get().setGeneratedNote(note);
      };

      set({ noteGenerationLoading: true });
      try {
        await doGenerate();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        log('Note generation error:');
        log(error);
        get().setNoteGenerationError(errorMessage);
      } finally {
        set({ noteGenerationLoading: false });
      }
    },

    generateAnyway: async () => {
      const { templates, selectedTemplateId, collectedInformation, settings, reviewMessage: currentReviewMessage } = get();
      const selectedTemplate = templates.find(t => t.id === selectedTemplateId) || null;

      insights.emit('template_review_response', {
        user_action: 'generate_anyway',
        review_message: currentReviewMessage,
      });
      get().setReviewMessage(null);

      const collectedText = collectedInformation.map((entry) => {
        if (entry.suggestedVariable) {
          return `[${entry.suggestedVariable}] ${entry.text}`;
        }
        return entry.text;
      });

      const insightsClient = insights.getClient();

      set({ noteGenerationLoading: true });
      try {
        const note = settings.useUnstructuredMode
          ? await generateNoteUnstructured(
              settings.aiModel,
              selectedTemplate!.template,
              collectedText,
              NOTE_GENERATION_SYSTEM_PROMPT
            )
          : await generateNoteAPI(
              settings.aiModel,
              selectedTemplate!.template,
              collectedText,
              NOTE_GENERATION_SYSTEM_PROMPT,
              3,
              insightsClient,
              { templateId: selectedTemplate!.id, templateName: selectedTemplate!.title }
            );
        get().setGeneratedNote(note);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        log('Note generation error:');
        log(error);
        get().setNoteGenerationError(errorMessage);
      } finally {
        set({ noteGenerationLoading: false });
      }
    },

    dismissReview: () => {
      insights.emit('template_review_response', {
        user_action: 'dismissed',
        review_message: get().reviewMessage,
      });
      get().setReviewMessage(null);
    },

    copyToClipboard: async (text?: string) => {
      const content = text || get().generatedNote;
      if (!content) return false;
      try {
        await navigator.clipboard.writeText(content);
        insights.emit('note_copied', { text: content });
        return true;
      } catch (error) {
        log('Copy to clipboard failed:');
        log(error);
        return false;
      }
    },

    selectTemplateAndBegin: (template: NoteTemplate) => {
      get().resetInformation();
      get().clearTranscript();
      get().setSelectedTemplate(template);
      get().setCurrentView('information_input');
    },

    switchStorageMode: async (mode: 'local' | 'cloud') => {
      const store = getRaiStore();
      if (mode === 'cloud' && store.getMode() !== 'cloud') {
        try {
          const queryFn = async (args: { query: string; variables?: Record<string, any> }) => {
            return await surreal_query(args);
          };
          store.switchToCloud(queryFn);
          const result = await migrateLocalToCloud(queryFn);
          insights.emit('storage_mode_changed', { mode: 'cloud', migrated: result.migrated, merged: result.merged, skipped: result.skipped, failed: result.failed });
          const parts: string[] = [];
          if (result.migrated > 0) parts.push(`${result.migrated} migrated`);
          if (result.merged > 0) parts.push(`${result.merged} synced from local`);
          if (result.skipped > 0) parts.push(`${result.skipped} already in cloud`);
          const desc = parts.length > 0 ? parts.join(', ') : 'Switched to cloud storage';
          toast_toast({ title: 'Switched to Cloud storage', description: desc, status: 'success', duration: 4000 });
          // Reload data from cloud so UI reflects actual cloud state
          await Promise.all([
            get().loadSettings().catch(() => {}),
            get().loadTemplates().catch(() => {}),
            get().loadDotPhrases().catch(() => {}),
          ]);
        } catch (err: any) {
          insights.emit('storage_mode_change_failed', { mode: 'cloud', error: err?.message });
          toast_toast({ title: 'Cloud storage failed', description: 'Please log in to use cloud storage', status: 'error', duration: 5000 });
          throw err;
        }
      } else if (mode === 'local') {
        store.switchToLocal();
        insights.emit('storage_mode_changed', { mode: 'local' });
        // Reload data from local backend so UI reflects local state
        await Promise.all([
          get().loadSettings().catch(() => {}),
          get().loadTemplates().catch(() => {}),
          get().loadDotPhrases().catch(() => {}),
        ]);
      }
      // Force re-render so UI reflects the new mode
      get().updateSettings({});
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

      log(`Cleared ${analyticsCount} analytics checkpoints and ${uiCount} UI checkpoints`);
    },

    // Settings
    settings: DEFAULT_SETTINGS,
    updateSettings: (newSettings: Partial<AppSettings>) => {
      const before = get().settings;
      const updated = { ...before, ...newSettings };
      const changedKeys = Object.keys(newSettings).filter(
        k => (before as any)[k] !== (newSettings as any)[k]
      );
      set({ settings: updated });

      get().saveSettings();

      // Return enriched data for auto-instrumentation
      return { changed_keys: changedKeys, before, after: updated };
    },
    loadSettings: async () => {
      try {
        const legacyResult = migrateLegacyLocalStorage();
        const queryFn = async (args: { query: string; variables?: Record<string, any> }) => {
          return await surreal_query(args);
        };
        const store = getRaiStore(insights.getClient() || undefined, queryFn);

        // Emit legacy migration result as system event
        insights.emit('rai_legacy_migration', legacyResult);

        // Wait for Firebase auth to resolve before cloud queries —
        // on page load, currentUser is null until the SDK loads the
        // persisted token (~300-800ms). Without this, cloud requests
        // go out unauthenticated and return empty.
        if (store.getMode() === 'cloud') {
          await waitForFirebaseAuth(3000);
        }

        const stored = await store.get<any>(RAI_DATA_KEYS.settings);

        // Check auth state after cloud round-trip
        const authState = checkCloudAuth();
        if (authState.needsAttention) {
          notifyCloudAuthRequired('settings_load', insights.emit);
        }

        if (stored) {
          const parsed = stored;
          let hadMigration = false;

          // Migration: vadThreshold → tivi settings
          if ('vadThreshold' in parsed) {
            const posThresh = parsed.vadThreshold;
            const negThresh = Math.max(0, posThresh - 0.15);
            updateTiviSettings({
              positiveSpeechThreshold: posThresh,
              negativeSpeechThreshold: negThresh,
            });
            delete parsed.vadThreshold;
            hadMigration = true;
          }
          if ('vadSilenceDurationMs' in parsed) {
            delete parsed.vadSilenceDurationMs;
            hadMigration = true;
          }

          // One-time migration: move voice/device fields from AppSettings to tivi settings
          const TIVI_MIGRATION_FLAG = 'tivi-settings-migrated-from-rai';
          const alreadyMigrated = typeof window !== 'undefined' && localStorage.getItem(TIVI_MIGRATION_FLAG);
          const VOICE_FIELDS = [
            'positiveSpeechThreshold', 'negativeSpeechThreshold', 'minSpeechStartMs',
            'powerThreshold', 'enableInterruption', 'tiviMode', 'playbackRate',
          ] as const;

          const hasVoiceFields = VOICE_FIELDS.some(f => f in parsed);
          if (hasVoiceFields && !alreadyMigrated) {
            // Build tivi settings from stored values
            const tiviUpdate: Record<string, any> = {};
            if ('positiveSpeechThreshold' in parsed) tiviUpdate.positiveSpeechThreshold = parsed.positiveSpeechThreshold;
            if ('negativeSpeechThreshold' in parsed) tiviUpdate.negativeSpeechThreshold = parsed.negativeSpeechThreshold;
            if ('minSpeechStartMs' in parsed) tiviUpdate.minSpeechStartMs = parsed.minSpeechStartMs;
            if ('powerThreshold' in parsed) tiviUpdate.powerThreshold = parsed.powerThreshold;
            if ('enableInterruption' in parsed) tiviUpdate.enableInterruption = parsed.enableInterruption;
            if ('tiviMode' in parsed) tiviUpdate.mode = parsed.tiviMode; // tiviMode → mode
            if ('playbackRate' in parsed) tiviUpdate.playbackRate = parsed.playbackRate;

            updateTiviSettings(tiviUpdate);
            localStorage.setItem(TIVI_MIGRATION_FLAG, new Date().toISOString());
            hadMigration = true;

            insights.emit('rai_voice_settings_migrated_to_tivi', {
              fields: Object.keys(tiviUpdate),
              values: tiviUpdate,
            });
          }

          // Strip voice fields from parsed settings (they now live in tivi)
          for (const field of VOICE_FIELDS) {
            delete parsed[field];
          }

          const merged = { ...DEFAULT_SETTINGS, ...parsed };
          set({ settings: merged });

          insights.emit('rai_settings_loaded', {
            source: 'stored',
            had_migration: hadMigration,
            raw_stored: stored,
            merged,
          });

          // Re-save cleaned settings (without voice fields)
          if (hadMigration) {
            await store.set(RAI_DATA_KEYS.settings, merged);
          }
        } else {
          set({ settings: DEFAULT_SETTINGS });

          insights.emit('rai_settings_loaded', {
            source: 'defaults',
            had_migration: false,
            raw_stored: null,
            merged: DEFAULT_SETTINGS,
          });
        }
      } catch (error) {
        log('Error loading settings:');
        log(error);
        set({ settings: DEFAULT_SETTINGS });
      }
    },
    saveSettings: async () => {
      try {
        const settings = get().settings;
        const store = getRaiStore();
        const ok = await store.set(RAI_DATA_KEYS.settings, settings);

        if (checkCloudAuth().needsAttention) {
          notifyCloudAuthRequired('save_settings', insights.emit);
        }

        // Return enriched data for auto-instrumentation
        return { ok, mode: store.getMode(), settings };
      } catch (error) {
        log('Error saving settings:');
        log(error);
      }
    },

    // Template Editor CRUD Operations
    createCustomTemplate: async (templateData) => {
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
      const result = await get().saveCustomTemplates();

      if (result?.localFallback) {
        // Local fallback — merge from in-memory state (don't read cloud which would return empty)
        const defaultTemplates = loadTemplatesFromFiles();
        defaultTemplates.forEach(t => t.isDefault = true);
        set({ templates: [...defaultTemplates, ...get().customTemplates] });
      } else {
        await get().loadTemplates(); // Refresh merged list
      }

      log(`Created custom template: ${newTemplate.title}`);
    },

    updateCustomTemplate: async (id, updates) => {
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
      const result = await get().saveCustomTemplates();

      if (result?.localFallback) {
        const defaultTemplates = loadTemplatesFromFiles();
        defaultTemplates.forEach(t => t.isDefault = true);
        set({ templates: [...defaultTemplates, ...get().customTemplates] });
      } else {
        await get().loadTemplates(); // Refresh merged list
      }

      log(`Updated custom template: ${id}`);
    },

    deleteCustomTemplate: async (id) => {
      const customTemplates = get().customTemplates.filter(t => t.id !== id);
      set({ customTemplates });
      const result = await get().saveCustomTemplates();

      if (result?.localFallback) {
        const defaultTemplates = loadTemplatesFromFiles();
        defaultTemplates.forEach(t => t.isDefault = true);
        set({ templates: [...defaultTemplates, ...get().customTemplates] });
      } else {
        await get().loadTemplates(); // Refresh merged list
      }

      // If deleting currently selected template, clear selection
      if (get().selectedTemplateId === id) {
        set({ selectedTemplateId: null });
      }

      log(`Deleted custom template: ${id}`);
    },

    loadCustomTemplates: async () => {
      try {
        const store = getRaiStore();
        const data = await store.get<any[]>(RAI_DATA_KEYS.customTemplates);
        const customTemplates = data ? loadCustomTemplatesFromData(data) : [];
        set({ customTemplates });
      } catch (error) {
        log('Error loading custom templates:');
        log(error);
        set({ customTemplates: [] });
      }
    },

    saveCustomTemplates: async (): Promise<{ localFallback: boolean }> => {
      try {
        const templates = get().customTemplates.map(t => ({
          id: t.id,
          title: t.title,
          description: t.description,
          template: t.template,
          createdAt: t.createdAt?.toISOString(),
          updatedAt: t.updatedAt?.toISOString(),
        }));
        const store = getRaiStore();
        const authState = checkCloudAuth();

        if (authState.needsAttention) {
          // Cloud mode but not authenticated — save to localStorage as fallback
          const localBackend = store.getLocalBackend();
          await localBackend.save('rai', RAI_DATA_KEYS.customTemplates, templates);
          notifyTemplateSavedLocally(insights.emit);
          log(`Saved ${templates.length} custom templates (local fallback — not authenticated)`);
          return { localFallback: true };
        }

        const ok = await store.set(RAI_DATA_KEYS.customTemplates, templates);
        log(`Saved ${templates.length} custom templates`);
        return { localFallback: !ok };
      } catch (error) {
        log('Error saving custom templates:');
        log(error);
        return { localFallback: false };
      }
    },

    // Dot Phrase CRUD operations
    createDotPhrase: (title: string, phrase: string, description?: string) => {
      const titleNormalized = normalizeDotPhraseTitle(title);
      const newDotPhrase: DotPhrase = {
        id: generateDotPhraseId(),
        title,
        titleNormalized,
        phrase,
        description,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      set({ dotPhrases: [...get().dotPhrases, newDotPhrase] });
      get().saveDotPhrases();
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
      log(`Updated dot phrase: ${id}`);
    },

    deleteDotPhrase: (id: string) => {
      set({ dotPhrases: get().dotPhrases.filter(dp => dp.id !== id) });
      get().saveDotPhrases();
      log(`Deleted dot phrase: ${id}`);
    },

    loadDotPhrases: async () => {
      try {
        const store = getRaiStore();
        const data = await store.get<any[]>(RAI_DATA_KEYS.dotPhrases);
        if (data && Array.isArray(data)) {
          const dotPhrases = data.map((dp: any) => ({
            ...dp,
            createdAt: dp.createdAt instanceof Date ? dp.createdAt : new Date(dp.createdAt),
            updatedAt: dp.updatedAt instanceof Date ? dp.updatedAt : new Date(dp.updatedAt),
          }));
          set({ dotPhrases });
          log(`Loaded ${dotPhrases.length} dot phrases`);
        } else {
          set({ dotPhrases: [] });
        }
      } catch (error) {
        log('Error loading dot phrases:');
        log(error);
        set({ dotPhrases: [] });
      }
    },

    saveDotPhrases: async () => {
      try {
        const dotPhrases = get().dotPhrases.map(dp => ({
          id: dp.id,
          title: dp.title,
          titleNormalized: dp.titleNormalized,
          phrase: dp.phrase,
          description: dp.description,
          createdAt: dp.createdAt.toISOString(),
          updatedAt: dp.updatedAt.toISOString(),
        }));
        const store = getRaiStore();
        await store.set(RAI_DATA_KEYS.dotPhrases, dotPhrases);
        log(`Saved ${dotPhrases.length} dot phrases`);
      } catch (error) {
        log('Error saving dot phrases:');
        log(error);
      }
    },

    setTemplateEditorMode: (mode) => {
      set({ templateEditorMode: mode });

      // Sync route after state update
      setTimeout(() => get().syncRouteFromState(), 0);
    },

    setEditingTemplate: (template) => {
      set({ editingTemplateId: template?.id ?? null });

      // Sync route after state update
      setTimeout(() => get().syncRouteFromState(), 0);
    },

    // Test Interface
    selectedTemplateForTestId: null as string | null,
    testInputText: '',
    selectedModels: [...SUPPORTED_MODELS], // Default: all models selected
    currentTestRun: null,
    isRunningTest: false,
    testHistory: [],
    analysisModel: DEFAULT_SETTINGS.aiModel,
    isAnalyzing: false,

    setSelectedTemplateForTest: (template) => {
      set({ selectedTemplateForTestId: template?.id ?? null });
    },

    setTestInputText: (text) => {
      set({ testInputText: text });
    },

    setSelectedModels: (models) => {
      set({ selectedModels: models });
    },

    setAnalysisModel: (model) => {
      set({ analysisModel: model });
    },

    startTest: async () => {
      const {
        selectedTemplateForTestId,
        testInputText,
        selectedModels,
        testHistory,
        templates,
      } = get();

      const selectedTemplateForTest = selectedTemplateForTestId
        ? templates.find(t => t.id === selectedTemplateForTestId) ?? null
        : null;

      if (!selectedTemplateForTest || !testInputText.trim() || selectedModels.length === 0) {
        log('Cannot start test: missing template, input, or models');
        return;
      }

      set({ isRunningTest: true });

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

        // Call LLM directly with proper system/user prompt separation
        const analysisContent = await callLLMDirect(
          analysisModel,
          system,
          user,
          3
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

        log({ msg: 'Analysis completed', length: analysisContent.length });
      } catch (error) {
        log({ msg: 'Analysis error', error });
      } finally {
        set({ isAnalyzing: false });
      }
    },

    loadTestHistory: async () => {
      try {
        const store = getRaiStore();
        const data = await store.get<any[]>(RAI_DATA_KEYS.testRuns);
        if (data && Array.isArray(data)) {
          const history: TestRun[] = data.map((run: any) => ({
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

    saveTestHistory: async () => {
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
        const store = getRaiStore();
        await store.set(RAI_DATA_KEYS.testRuns, serialized);
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
          selectedTemplateForTestId: template?.id ?? null,
          testInputText: testRun.inputText,
          selectedModels: testRun.models,
          currentTestRun: testRun,
        });
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

      log({ msg: 'Test run deleted', testRunId });
    },
  }),
});
