import { defineWorkflow } from '../../../../../src/lib/simi';

export const fullNoteFlow = defineWorkflow({
  id: 'full_note_flow',
  app: 'rai',
  tags: ['e2e', 'note_generation', 'clipboard'],
  steps: [
    // Wait for templates to load (async init)
    { waitFor: 'state.templates.length > 0', timeout: 15000 },
    // Select first template and begin
    {
      action: 'selectTemplateAndBegin',
      args: [{ $resolve: 'find', path: 'templates', index: 0 }],
      wait: 500,
    },
    // Add patient information entries
    {
      action: 'addInformationText',
      args: ['Patient is a 35 year old female presenting for IVF consultation. History of PCOS diagnosed 3 years ago.'],
      wait: 300,
    },
    {
      action: 'addInformationText',
      args: ['Labs: AMH 4.2 ng/mL, FSH 6.1 mIU/mL, AFC 12 bilateral. BMI 26.'],
      wait: 300,
    },
    {
      action: 'addInformationText',
      args: ['Plan: Start antagonist protocol with letrozole priming. Follow up in 2 weeks for baseline ultrasound.'],
      wait: 300,
    },
    // Mark information collection complete
    { action: 'setInformationComplete', args: [true], wait: 300 },
    { assert: 'state.collectedInformation.length >= 3', message: 'Should have at least 3 information entries' },
    // Navigate to note generator
    { action: 'setCurrentView', args: ['note_generator'], wait: 500 },
    { assert: 'state.currentView === "note_generator"' },
    // Generate the note (actual LLM call — awaited with 120s timeout)
    { action: 'generateNote', args: [], timeout: 120000, wait: 500 },
    // Assert note was generated
    { assert: 'state.generatedNote !== null && state.generatedNote.length > 0', message: 'Generated note should have content' },
    // Copy to clipboard
    { action: 'copyToClipboard', args: [], wait: 500 },
  ],
});
