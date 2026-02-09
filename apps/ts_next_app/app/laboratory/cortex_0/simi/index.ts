import { basicChatFlow } from './workflows/basic_chat_flow';
import { fullConversationFlow } from './workflows/full_conversation_flow';
import { settingsPersistenceFlow } from './workflows/settings_persistence_flow';
import { sessionSaveLoadFlow } from './workflows/session_save_load_flow';
import { codeExecutionFlow } from './workflows/code_execution_flow';
import { multiTurnContextFlow } from './workflows/multi_turn_context_flow';
import { workspaceUpdateFlow } from './workflows/workspace_update_flow';
import { htmlDisplayFlow } from './workflows/html_display_flow';

export const cortexWorkflows = {
  basic_chat_flow: basicChatFlow,
  full_conversation_flow: fullConversationFlow,
  settings_persistence_flow: settingsPersistenceFlow,
  session_save_load_flow: sessionSaveLoadFlow,
  code_execution_flow: codeExecutionFlow,
  multi_turn_context_flow: multiTurnContextFlow,
  workspace_update_flow: workspaceUpdateFlow,
  html_display_flow: htmlDisplayFlow,
};
