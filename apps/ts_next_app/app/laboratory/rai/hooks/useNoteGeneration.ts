// useNoteGeneration Hook - Thin wrapper over store actions

import { useRaiStore } from '../store/useRaiStore';

export function useNoteGeneration(insightsClient?: any) {
  const store = useRaiStore();
  return {
    generate: store.generateNote,
    generateAnyway: store.generateAnyway,
    dismissReview: store.dismissReview,
    generatedNote: store.generatedNote,
    loading: store.noteGenerationLoading,
    reviewing: store.reviewing,
    reviewMessage: store.reviewMessage,
    error: store.noteGenerationError,
  };
}
