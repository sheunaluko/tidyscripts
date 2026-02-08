import { defineWorkflow } from '../../../../../src/lib/simi';

/**
 * Dot Phrase CRUD Flow — create, verify, edit, and delete a dot phrase
 *
 * Tests the full lifecycle of dot phrase management.
 */
export const dotPhraseCrudFlow = defineWorkflow({
  id: 'dot_phrase_crud_flow',
  app: 'rai',
  tags: ['smoke', 'dot_phrases'],
  steps: [
    // Record initial dot phrase count
    {
      assert: 'Array.isArray(state.dotPhrases)',
      message: 'dotPhrases should be an array',
    },

    // Create a dot phrase
    {
      id: 'create_dot_phrase',
      action: 'createDotPhrase',
      args: ['simidp', 'This is a test dot phrase created by Simi workflow', 'Test dot phrase for automated testing'],
      wait: 500,
    },

    // Assert it exists
    {
      assert: 'state.dotPhrases.some(dp => dp.titleNormalized === "simidp")',
      message: 'Dot phrase should exist after creation',
    },
    {
      assert: 'state.dotPhrases.some(dp => dp.phrase === "This is a test dot phrase created by Simi workflow")',
      message: 'Dot phrase content should match',
    },

    // Update the dot phrase
    {
      id: 'update_dot_phrase',
      action: 'updateDotPhrase',
      args: [
        { $resolve: 'eval', fn: (state: any) => state.dotPhrases.find((dp: any) => dp.titleNormalized === 'simidp')?.id },
        { phrase: 'Updated dot phrase content by Simi workflow' },
      ],
      wait: 500,
    },

    // Assert update
    {
      assert: 'state.dotPhrases.some(dp => dp.titleNormalized === "simidp" && dp.phrase === "Updated dot phrase content by Simi workflow")',
      message: 'Dot phrase content should be updated',
    },

    // Delete the dot phrase
    {
      id: 'delete_dot_phrase',
      action: 'deleteDotPhrase',
      args: [
        { $resolve: 'eval', fn: (state: any) => state.dotPhrases.find((dp: any) => dp.titleNormalized === 'simidp')?.id },
      ],
      wait: 500,
    },

    // Assert deletion
    {
      assert: '!state.dotPhrases.some(dp => dp.titleNormalized === "simidp")',
      message: 'Dot phrase should be removed after deletion',
    },
  ],
});
