import { defineWorkflow } from '../../../../../src/lib/simi';

export const basicNoteFlow = defineWorkflow({
  id: 'basic_note_flow',
  app: 'rai',
  tags: ['smoke', 'note_generation'],
  steps: [
    {
      action: 'setSelectedTemplate',
      args: [{ $resolve: 'find', path: 'templates', index: 0 }],
      wait: 500,
    },
    { action: 'setCurrentView', args: ['information_input'], wait: 500 },
    {
      id: 'add_info',
      action: 'addInformationText',
      args: ['Patient is a 35 year old female presenting for IVF consultation. History of PCOS. AMH 4.2, FSH 6.1, AFC 12 bilateral.'],
      wait: 300,
    },
    { action: 'setInformationComplete', args: [true], wait: 300 },
    { assert: 'state.collectedInformation.length > 0', message: 'Should have information entries' },
    { action: 'setCurrentView', args: ['note_generator'], wait: 500 },
    { assert: 'state.currentView === "note_generator"' },
  ],
});
