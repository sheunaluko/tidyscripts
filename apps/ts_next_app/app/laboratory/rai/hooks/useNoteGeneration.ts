// useNoteGeneration Hook - Note generation logic

import { useCallback } from 'react';
import { useRaiStore } from '../store/useRaiStore';
import { generateNote } from '../lib/noteGenerator';
import * as tsw from 'tidyscripts_web';
import { NOTE_GENERATION_SYSTEM_PROMPT } from '../prompts/note_generation_prompt';

const log = tsw.common.logger.get_logger({ id: 'rai' });

export function useNoteGeneration() {
  const {
    selectedTemplate,
    collectedInformation,
    settings,
    setGeneratedNote,
    setNoteGenerationLoading,
    setNoteGenerationError,
    generatedNote,
    noteGenerationLoading,
    noteGenerationError,
  } = useRaiStore();

  const generate = useCallback(async () => {
    if (!selectedTemplate) {
      setNoteGenerationError('No template selected');
      return;
    }

    if (collectedInformation.length === 0) {
      setNoteGenerationError('No information collected');
      return;
    }

    setNoteGenerationLoading(true);
    setNoteGenerationError(null);

    try {
      // Extract text from information entries
      const collectedText = collectedInformation.map((entry) => entry.text);

      // Generate note
      const note = await generateNote(
        settings.aiModel,
        selectedTemplate.template,
        collectedText,
        NOTE_GENERATION_SYSTEM_PROMPT
      );

      setGeneratedNote(note);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      log('Note generation error:');
      log(error);
      setNoteGenerationError(errorMessage);
    } finally {
      setNoteGenerationLoading(false);
    }
  }, [
    selectedTemplate,
    collectedInformation,
    settings.aiModel,
    setGeneratedNote,
    setNoteGenerationLoading,
    setNoteGenerationError,
  ]);

  return {
    generate,
    generatedNote,
    loading: noteGenerationLoading,
    error: noteGenerationError,
  };
}
