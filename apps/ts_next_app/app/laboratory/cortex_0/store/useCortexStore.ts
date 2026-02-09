/**
 * useCortexStore — Zustand store for Cortex 0 via createInsightStore
 *
 * Centralizes key state that was previously scattered across ~25 useState
 * hooks in app3.tsx. UI-only state (mode, drawerOpen, chatInput, etc.)
 * stays as local useState in app3.tsx.
 */

import * as tsw from 'tidyscripts_web';
import { createInsightStore } from '../../../../src/lib/createInsightStore';
import { getCortexStore, CORTEX_DATA_KEYS, migrateLegacyLocalStorage, migrateLocalToCloud } from '../lib/storage';
import { checkCloudAuth, notifyCloudAuthRequired, waitForFirebaseAuth, isFirebaseAuthenticated } from '../lib/authCheck';
import { surreal_query } from '../../../../src/firebase_utils';
import { toast_toast } from '../../../../components/Toast';
import { cortexWorkflows } from '../simi';
import type { ExecutionSnapshot } from '../types/execution';

const log = tsw.common.logger.get_logger({ id: 'cortex_store' });

// ─── Settings type ───────────────────────────────────────────────────

interface CortexSettings {
  aiModel: string;
  speechCooldownMs: number;
  soundFeedback: boolean;
}

const DEFAULT_SETTINGS: CortexSettings = {
  aiModel: 'o4-mini',
  speechCooldownMs: 2000,
  soundFeedback: true,
};

// ─── State interface ─────────────────────────────────────────────────

export interface CortexState {
  // === Auth ===
  isAuthenticated: boolean;
  checkAuth(): void;

  // === Settings (persisted) ===
  aiModel: string;
  speechCooldownMs: number;
  soundFeedback: boolean;
  updateSettings(partial: Partial<CortexSettings>): void;
  loadSettings(): Promise<void>;
  saveSettings(): Promise<void>;

  // === Chat (persisted) ===
  chatHistory: Array<{ role: string; content: string }>;
  lastAiMessage: string;
  addUserMessage(content: string): void;
  addAiMessage(content: string): void;
  clearChat(): void;

  // === Workspace (persisted) ===
  workspace: Record<string, any>;
  updateWorkspace(ws: Record<string, any>): void;

  // === Observable (not persisted) ===
  thoughtHistory: string[];
  logHistory: string[];
  htmlDisplay: string;
  codeParams: { code: string; mode: string };
  contextUsage: { usagePercent: number; totalUsed: number; contextWindow: number } | null;

  // === Event handlers ===
  handleThought(evt: any): void;
  handleLog(evt: any): void;
  handleCodeUpdate(evt: any): void;
  handleHtmlUpdate(evt: any): void;
  handleContextStatus(evt: any): void;
  handleCodeExecutionStart(evt: any): void;
  handleCodeExecutionComplete(evt: any): void;
  handleSandboxLog(evt: any): void;
  handleSandboxEvent(evt: any): void;

  // === Execution state ===
  currentCode: string;
  executionId: string;
  executionStatus: 'idle' | 'running' | 'success' | 'error';
  executionError: string;
  executionDuration: number;
  executionResult: any;
  functionCalls: any[];
  variableAssignments: any[];
  sandboxLogs: any[];
  executionHistory: ExecutionSnapshot[];
  selectedIndex: number;
  isPinned: boolean;
  handleHistoryItemClick(index: number): void;
  setIsPinned(pinned: boolean): void;
  captureExecutionSnapshot(): void;

  // === Session save/load ===
  saveSession(label?: string): Promise<void>;
  loadSession(sessionId: string): Promise<void>;
  listSessions(): Promise<Array<{ id: string; label: string; timestamp: number }>>;

  // === Storage mode ===
  switchStorageMode(mode: 'local' | 'cloud'): Promise<void>;

  // === Agent ref (for replay/dispatch) ===
  agent: any | null;
  setAgent(agent: any): void;
  /** True while sendMessage is driving the LLM — prevents useEffect double-fire */
  _llmActive: boolean;
  /**
   * Full user→AI message cycle. Dispatchable for replay.
   * Adds user message, tells agent, runs LLM, returns result.
   * The agent's configured user_output callback (add_ai_message in app3)
   * handles speech synthesis and adding the AI message to the store.
   */
  sendMessage(content: string): Promise<any>;

  // === Persistence helpers ===
  saveConversation(): Promise<void>;
  loadConversation(): Promise<void>;
}

// ─── Store ───────────────────────────────────────────────────────────

export const useCortexStore = createInsightStore<CortexState>({
  appName: 'cortex_0',
  silent: ['checkAuth', 'captureExecutionSnapshot', 'setAgent'],
  workflows: cortexWorkflows,
  creator: (set, get, _api, insights) => ({

    // ── Auth ──────────────────────────────────────────────────────────

    isAuthenticated: false,

    checkAuth() {
      const result = checkCloudAuth();
      set({ isAuthenticated: result.isAuthenticated });
      if (result.needsAttention) {
        notifyCloudAuthRequired('settings_load', (type, payload) =>
          insights.emit(type, payload)
        );
      }
    },

    // ── Settings ─────────────────────────────────────────────────────

    aiModel: DEFAULT_SETTINGS.aiModel,
    speechCooldownMs: DEFAULT_SETTINGS.speechCooldownMs,
    soundFeedback: DEFAULT_SETTINGS.soundFeedback,

    updateSettings(partial: Partial<CortexSettings>) {
      const before = { aiModel: get().aiModel, speechCooldownMs: get().speechCooldownMs, soundFeedback: get().soundFeedback };
      set(partial);
      insights.emit('cortex_settings_updated', {
        changed_keys: Object.keys(partial),
        before,
        after: { ...before, ...partial },
      });
    },

    async loadSettings() {
      // Run legacy migration (idempotent)
      const migration = migrateLegacyLocalStorage();
      if (migration.migrated > 0) {
        insights.emit('cortex_legacy_migration', migration);
      }

      // Create/upgrade AppDataStore singleton
      const store = getCortexStore(insights.getClient(), surreal_query);

      // Wait for Firebase auth to resolve before cloud queries —
      // on page load, currentUser is null until the SDK loads the
      // persisted token (~300-800ms). Without this, cloud requests
      // go out unauthenticated and return empty.
      if (store.getMode() === 'cloud') {
        await waitForFirebaseAuth(2000);
      }

      // Load settings from storage
      try {
        const stored = await store.get<CortexSettings>(CORTEX_DATA_KEYS.settings);
        if (stored) {
          const merged = { ...DEFAULT_SETTINGS, ...stored };
          set({
            aiModel: merged.aiModel,
            speechCooldownMs: merged.speechCooldownMs,
            soundFeedback: merged.soundFeedback,
          });
          insights.emit('cortex_settings_loaded', {
            source: store.getMode(),
            had_migration: migration.migrated > 0,
            raw_stored: stored,
            merged,
          });
        }
      } catch (err: any) {
        log(`Failed to load settings: ${err}`);
      }

      // Run auth check after settings are loaded
      get().checkAuth();

      insights.emit('cortex_settings_loaded_complete', {
        mode: store.getMode(),
        isAuthenticated: get().isAuthenticated,
      });
    },

    async saveSettings() {
      const { aiModel, speechCooldownMs, soundFeedback } = get();
      const settings: CortexSettings = { aiModel, speechCooldownMs, soundFeedback };
      const store = getCortexStore();
      try {
        await store.set(CORTEX_DATA_KEYS.settings, settings);
        insights.emit('cortex_settings_saved', {
          ok: true,
          mode: store.getMode(),
          settings,
        });
      } catch (err: any) {
        log(`Failed to save settings: ${err}`);
      }
    },

    // ── Chat ─────────────────────────────────────────────────────────

    chatHistory: [
      { role: 'system', content: 'You are an AI voice agent, and as such your responses should be concise and to the point and allow the user to request more if needed, especially because long responses create a delay for audio generation. Do not ask if I want further details or more information at the end of your response!' },
    ],
    lastAiMessage: '',

    addUserMessage(content: string) {
      set((s) => ({
        chatHistory: [...s.chatHistory, { role: 'user', content }],
      }));
    },

    addAiMessage(content: string) {
      set((s) => ({
        chatHistory: [...s.chatHistory, { role: 'assistant', content }],
        lastAiMessage: content,
      }));
    },

    clearChat() {
      set({
        chatHistory: [
          { role: 'system', content: 'You are an AI voice agent, and as such your responses should be concise and to the point and allow the user to request more if needed, especially because long responses create a delay for audio generation. Do not ask if I want further details or more information at the end of your response!' },
        ],
        lastAiMessage: '',
      });
    },

    // ── Workspace ────────────────────────────────────────────────────

    workspace: {},

    updateWorkspace(ws: Record<string, any>) {
      set({ workspace: { ...ws } });
    },

    // ── Observable (not persisted) ───────────────────────────────────

    thoughtHistory: [],
    logHistory: [],
    htmlDisplay: '<h1>Hello from Cortex</h1>',
    codeParams: { code: 'print("Welcome to Tidyscripts!")', mode: 'python' },
    contextUsage: null,

    // ── Event handlers ───────────────────────────────────────────────

    handleThought(evt: any) {
      const { thought } = evt;
      log(`Got thought event: ${thought}`);
      set((s) => ({ thoughtHistory: [...s.thoughtHistory, thought] }));
    },

    handleLog(evt: any) {
      log(`Got log event: ${evt.log}`);
      set((s) => ({ logHistory: [...s.logHistory, evt.log] }));
    },

    handleCodeUpdate(evt: any) {
      log(`Got code update event`);
      set({ codeParams: { code: evt.code_params.code, mode: evt.code_params.mode } });
    },

    handleHtmlUpdate(evt: any) {
      log(`Got html update event`);
      set({ htmlDisplay: evt.html });
    },

    handleContextStatus(evt: any) {
      const { usagePercent, totalUsed, contextWindow } = evt.status;
      log(`Context: ${usagePercent.toFixed(1)}% (${totalUsed}/${contextWindow} tokens)`);
      set({ contextUsage: { usagePercent, totalUsed, contextWindow } });
    },

    handleCodeExecutionStart(evt: any) {
      log(`Got code execution start event`);
      const { isPinned } = get();
      set({
        currentCode: evt.code,
        executionId: evt.executionId,
        executionStatus: 'running',
        executionError: '',
        executionDuration: 0,
        functionCalls: [],
        variableAssignments: [],
        sandboxLogs: [],
        ...(isPinned ? {} : { selectedIndex: -1 }),
      });
    },

    handleCodeExecutionComplete(evt: any) {
      log(`Got code execution complete event`);
      const { status, error, duration, result } = evt;
      set({
        executionStatus: status,
        executionError: error || '',
        executionDuration: duration,
        executionResult: result,
      });
      // Capture snapshot after state is set
      setTimeout(() => get().captureExecutionSnapshot(), 0);
    },

    handleSandboxLog(evt: any) {
      log(`Got sandbox log event: ${evt.level}`);
      set((s) => ({
        sandboxLogs: [...s.sandboxLogs, {
          level: evt.level,
          args: evt.args,
          timestamp: evt.timestamp,
        }],
      }));
    },

    handleSandboxEvent(evt: any) {
      const { eventType, data, timestamp } = evt;
      log(`Got sandbox event: ${eventType}`);

      switch (eventType) {
        case 'function_start':
          set((s) => ({
            functionCalls: [...s.functionCalls, {
              name: data.name,
              args: data.args,
              timestamp,
              callId: data.callId,
              status: 'running',
            }],
          }));
          break;

        case 'function_end':
          set((s) => ({
            functionCalls: s.functionCalls.map((call: any) =>
              call.callId === data.callId
                ? { ...call, duration: data.duration, status: 'success', result: data.result }
                : call
            ),
          }));
          break;

        case 'function_error':
          set((s) => ({
            functionCalls: s.functionCalls.map((call: any) =>
              call.callId === data.callId
                ? { ...call, error: data.error, status: 'error' }
                : call
            ),
          }));
          break;

        case 'variable_set':
          set((s) => ({
            variableAssignments: [...s.variableAssignments, {
              name: data.name,
              value: data.value,
              timestamp,
            }],
          }));
          break;
      }
    },

    // ── Execution state ──────────────────────────────────────────────

    currentCode: '',
    executionId: '',
    executionStatus: 'idle',
    executionError: '',
    executionDuration: 0,
    executionResult: undefined,
    functionCalls: [],
    variableAssignments: [],
    sandboxLogs: [],
    executionHistory: [],
    selectedIndex: -1,
    isPinned: false,

    handleHistoryItemClick(index: number) {
      set({ selectedIndex: index });
    },

    setIsPinned(pinned: boolean) {
      set({ isPinned: pinned });
    },

    captureExecutionSnapshot() {
      const { executionStatus, executionId, currentCode, executionError,
              executionDuration, executionResult, functionCalls,
              variableAssignments, sandboxLogs, isPinned } = get();

      if ((executionStatus === 'success' || executionStatus === 'error') && executionId) {
        const snapshot: ExecutionSnapshot = {
          executionId,
          timestamp: Date.now(),
          code: currentCode,
          status: executionStatus as 'success' | 'error',
          error: executionError || undefined,
          duration: executionDuration,
          result: executionResult,
          functionCalls: [...functionCalls],
          variableAssignments: [...variableAssignments],
          sandboxLogs: [...sandboxLogs],
        };

        set((s) => {
          const updated = [...s.executionHistory, snapshot].slice(-100);
          return {
            executionHistory: updated,
            ...(isPinned ? {} : { selectedIndex: -1 }),
          };
        });
      }
    },

    // ── Session save/load ────────────────────────────────────────────

    async saveSession(label?: string) {
      const state = get();
      const sessionId = `session_${Date.now()}`;
      const session = {
        id: sessionId,
        label: label || `Session ${new Date().toLocaleString()}`,
        timestamp: Date.now(),
        chatHistory: state.chatHistory,
        workspace: state.workspace,
        thoughtHistory: state.thoughtHistory,
        logHistory: state.logHistory,
        executionHistory: state.executionHistory,
        settings: {
          aiModel: state.aiModel,
          speechCooldownMs: state.speechCooldownMs,
          soundFeedback: state.soundFeedback,
        },
      };

      const store = getCortexStore();
      try {
        const existing = await store.get<any[]>(CORTEX_DATA_KEYS.sessions) || [];
        const updated = [...existing, session].slice(-50); // Keep last 50
        await store.set(CORTEX_DATA_KEYS.sessions, updated);
        insights.emit('cortex_session_saved', { sessionId, label: session.label });
        log(`Session saved: ${sessionId}`);
      } catch (err: any) {
        log(`Failed to save session: ${err}`);
      }
    },

    async loadSession(sessionId: string) {
      const store = getCortexStore();
      try {
        const sessions = await store.get<any[]>(CORTEX_DATA_KEYS.sessions) || [];
        const session = sessions.find((s: any) => s.id === sessionId);
        if (!session) {
          log(`Session not found: ${sessionId}`);
          return;
        }

        set({
          chatHistory: session.chatHistory || get().chatHistory,
          workspace: session.workspace || {},
          thoughtHistory: session.thoughtHistory || [],
          logHistory: session.logHistory || [],
          executionHistory: session.executionHistory || [],
          aiModel: session.settings?.aiModel || get().aiModel,
          speechCooldownMs: session.settings?.speechCooldownMs || get().speechCooldownMs,
          soundFeedback: session.settings?.soundFeedback ?? get().soundFeedback,
        });

        insights.emit('cortex_session_loaded', { sessionId });
        log(`Session loaded: ${sessionId}`);
      } catch (err: any) {
        log(`Failed to load session: ${err}`);
      }
    },

    async listSessions() {
      const store = getCortexStore();
      try {
        const sessions = await store.get<any[]>(CORTEX_DATA_KEYS.sessions) || [];
        return sessions.map((s: any) => ({
          id: s.id,
          label: s.label,
          timestamp: s.timestamp,
        }));
      } catch (err: any) {
        log(`Failed to list sessions: ${err}`);
        return [];
      }
    },

    // ── Storage mode ─────────────────────────────────────────────────

    async switchStorageMode(mode: 'local' | 'cloud') {
      const store = getCortexStore();
      try {
        if (mode === 'cloud') {
          // Check auth first
          if (!isFirebaseAuthenticated()) {
            notifyCloudAuthRequired('switch_to_cloud', (type, payload) =>
              insights.emit(type, payload)
            );
            return;
          }
          store.switchToCloud(surreal_query);
          // Migrate local data to cloud
          const migrationResult = await migrateLocalToCloud(surreal_query);
          insights.emit('storage_mode_changed', { mode, ...migrationResult });
          toast_toast({
            title: 'Switched to cloud storage',
            description: `${migrationResult.migrated} items migrated`,
            status: 'success',
            duration: 3000,
          });
        } else {
          store.switchToLocal();
          insights.emit('storage_mode_changed', { mode });
          toast_toast({
            title: 'Switched to local storage',
            description: 'Data stored in this browser only',
            status: 'info',
            duration: 3000,
          });
        }
        // Reload data from new backend
        await get().loadSettings();
        await get().loadConversation();
      } catch (err: any) {
        log(`Failed to switch storage mode: ${err}`);
        insights.emit('storage_mode_change_failed', { mode, error: err?.message });
      }
    },

    // ── Agent ref (for replay/dispatch) ─────────────────────────────

    agent: null as any,

    setAgent(agent: any) {
      set({ agent });
    },

    _llmActive: false,

    async sendMessage(content: string) {
      const { agent } = get();
      if (!agent) {
        log('sendMessage: no agent available');
        return;
      }

      // Set guard flag so the useEffect in app3.tsx doesn't double-fire
      set({ _llmActive: true });

      try {
        // 1. Add user message to store
        get().addUserMessage(content);

        // 2. Tell agent about the input
        agent.add_user_text_input(content);

        // 3. Emit user input telemetry
        const client = insights.getClient();
        if (client) {
          (client as any).addUserInput?.({
            input_mode: 'dispatch',
            input_length: content.length,
            context: { content },
          })?.catch?.(() => {});
        }

        // 4. Run the LLM loop — agent calls its configured user_output
        //    callback (add_ai_message in app3) which handles speech + store update
        log('sendMessage: calling run_llm');
        const result = await agent.run_llm(4);
        log('sendMessage: run_llm complete');

        return result;
      } catch (err: any) {
        log(`sendMessage error: ${err}`);
        throw err;
      } finally {
        set({ _llmActive: false });
      }
    },

    // ── Persistence helpers ──────────────────────────────────────────

    async saveConversation() {
      const { chatHistory, workspace } = get();
      const store = getCortexStore();
      try {
        await store.set(CORTEX_DATA_KEYS.conversations, { chat_history: chatHistory, workspace });
      } catch (err: any) {
        log(`Failed to save conversation: ${err}`);
      }
    },

    async loadConversation() {
      const store = getCortexStore();
      try {
        const data = await store.get<{ chat_history: any[]; workspace: Record<string, any> }>(CORTEX_DATA_KEYS.conversations);
        if (data) {
          if (data.chat_history && data.chat_history.length > 0) {
            set({ chatHistory: data.chat_history });
          }
          if (data.workspace) {
            set({ workspace: data.workspace });
          }
          insights.emit('cortex_conversation_loaded', {
            chat_length: data.chat_history?.length || 0,
            has_workspace: !!data.workspace && Object.keys(data.workspace).length > 0,
          });
        }
      } catch (err: any) {
        log(`Failed to load conversation: ${err}`);
      }
    },
  }),
});
