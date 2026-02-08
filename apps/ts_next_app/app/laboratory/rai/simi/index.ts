import { basicNoteFlow } from './workflows/basic_note_flow';
import { fullNoteFlow } from './workflows/full_note_flow';
import { templateCrudFlow } from './workflows/template_crud_flow';
import { settingsPersistenceFlow } from './workflows/settings_persistence_flow';
import { loggedOutCloudFallbackFlow } from './workflows/logged_out_cloud_fallback_flow';
import { dotPhraseCrudFlow } from './workflows/dot_phrase_crud_flow';
import { textInputNoteFlow } from './workflows/text_input_note_flow';
import { multiTemplateSelectionFlow } from './workflows/multi_template_selection_flow';

export const raiWorkflows = {
  basic_note_flow: basicNoteFlow,
  full_note_flow: fullNoteFlow,
  template_crud_flow: templateCrudFlow,
  settings_persistence_flow: settingsPersistenceFlow,
  logged_out_cloud_fallback_flow: loggedOutCloudFallbackFlow,
  dot_phrase_crud_flow: dotPhraseCrudFlow,
  text_input_note_flow: textInputNoteFlow,
  multi_template_selection_flow: multiTemplateSelectionFlow,
};
