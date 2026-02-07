// useNoteGeneration Hook - Note generation logic

import { useCallback, useState } from 'react';
import { useRaiStore } from '../store/useRaiStore';
import { useSelectedTemplate } from './useTemplateLookups';
import { generateNote, generateNoteUnstructured } from '../lib/noteGenerator';
import { reviewTemplate } from '../lib/rai_agent_web';
import * as tsw from 'tidyscripts_web';
import { NOTE_GENERATION_SYSTEM_PROMPT } from '../prompts/note_generation_prompt';

const log = tsw.common.logger.get_logger({ id: 'rai' });

export function useNoteGeneration(insightsClient?: any) {
  const selectedTemplate = useSelectedTemplate();
  const {
    collectedInformation,
    settings,
    setGeneratedNote,
    setNoteGenerationLoading,
    setNoteGenerationError,
    generatedNote,
    noteGenerationLoading,
    noteGenerationError,
  } = useRaiStore();

  const [reviewing, setReviewing] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);

  const doGenerate = useCallback(async (collectedText: string[]) => {
    const note = settings.useUnstructuredMode
      ? await generateNoteUnstructured(
          settings.aiModel,
          selectedTemplate!.template,
          collectedText,
          NOTE_GENERATION_SYSTEM_PROMPT
        )
      : await generateNote(
          settings.aiModel,
          selectedTemplate!.template,
          collectedText,
          NOTE_GENERATION_SYSTEM_PROMPT,
          3,
          insightsClient,
          { templateId: selectedTemplate!.id, templateName: selectedTemplate!.title }
        );

    setGeneratedNote(note);
  }, [settings.aiModel, settings.useUnstructuredMode, selectedTemplate, insightsClient, setGeneratedNote]);

  const getCollectedText = useCallback(() => {
    return collectedInformation.map((entry) => {
      if (entry.suggestedVariable) {
        return `[${entry.suggestedVariable}] ${entry.text}`;
      }
      return entry.text;
    });
  }, [collectedInformation]);

  const generate = useCallback(async () => {
    if (!selectedTemplate) {
      setNoteGenerationError('No template selected');
      return;
    }

    if (collectedInformation.length === 0) {
      setNoteGenerationError('No information collected');
      return;
    }

    setNoteGenerationError(null);
    setReviewMessage(null);

    const collectedText = getCollectedText();

    // Review template requirements if @END_TEMPLATE exists
    if (selectedTemplate.template.includes('@END_TEMPLATE')) {
      setReviewing(true);
      const reviewStart = Date.now();
      try {
        const review = await reviewTemplate(
          selectedTemplate,
          collectedInformation,
          settings.agentModel,
          insightsClient
        );
        const latency_ms = Date.now() - reviewStart;

        insightsClient?.addEvent?.('template_review', {
          template_id: selectedTemplate.id,
          template_name: selectedTemplate.title,
          collected_text: collectedText,
          model: settings.agentModel,
          action: review.action,
          message: review.message || null,
          latency_ms,
        });

        if (review.action === 'user_message' && review.message) {
          setReviewing(false);
          setReviewMessage(review.message);
          return;
        }
      } catch (err) {
        log('Review failed, proceeding with generation: ' + err);
        insightsClient?.addEvent?.('template_review', {
          template_id: selectedTemplate.id,
          action: 'error',
          error: String(err),
          latency_ms: Date.now() - reviewStart,
        });
      }
      setReviewing(false);
    }

    // Review passed or no review needed — generate
    setNoteGenerationLoading(true);
    try {
      await doGenerate(collectedText);
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
    settings.agentModel,
    getCollectedText,
    doGenerate,
    setNoteGenerationLoading,
    setNoteGenerationError,
    insightsClient,
  ]);

  const generateAnyway = useCallback(async () => {
    insightsClient?.addEvent?.('template_review_response', {
      user_action: 'generate_anyway',
      review_message: reviewMessage,
    });
    setReviewMessage(null);
    setNoteGenerationLoading(true);
    try {
      await doGenerate(getCollectedText());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      log('Note generation error:');
      log(error);
      setNoteGenerationError(errorMessage);
    } finally {
      setNoteGenerationLoading(false);
    }
  }, [doGenerate, getCollectedText, setNoteGenerationLoading, setNoteGenerationError, insightsClient, reviewMessage]);

  const dismissReview = useCallback(() => {
    insightsClient?.addEvent?.('template_review_response', {
      user_action: 'dismissed',
      review_message: reviewMessage,
    });
    setReviewMessage(null);
  }, [insightsClient, reviewMessage]);

  return {
    generate,
    generateAnyway,
    dismissReview,
    generatedNote,
    loading: noteGenerationLoading,
    reviewing,
    reviewMessage,
    error: noteGenerationError,
  };
}
