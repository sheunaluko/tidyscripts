import React from 'react';
import { render, RenderResult, act } from '@testing-library/react';
import { AssessmentProvider, useAssessment } from '../app/apps/3dcam_v2/AssessmentContext';
import { ITEMS } from '../app/apps/3dcam_v2/new_items';
import { Item } from '../app/apps/3dcam_v2/types';

// Component to extract context values for testing
interface TestContextExtractorProps {
  onStateChange: (state: any) => void;
}

const TestContextExtractor: React.FC<TestContextExtractorProps> = ({ onStateChange }) => {
  const assessmentContext = useAssessment();
  
  React.useEffect(() => {
    onStateChange(assessmentContext);
  }, [assessmentContext, onStateChange]);

  return <div data-testid="context-extractor" />;
};

export class TestHarness {
  private renderResult: RenderResult | null = null;
  private currentState: any = null;
  private stateHistory: any[] = [];

  constructor() {
    this.setup();
  }

  private setup() {
    const handleStateChange = (state: any) => {
      this.currentState = state;
      this.stateHistory.push({ ...state, timestamp: Date.now() });
    };

    // We need a way to access the context - let's create a custom provider wrapper
    const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
      return (
        <AssessmentProvider>
          <TestContextExtractor onStateChange={handleStateChange} />
          {children}
        </AssessmentProvider>
      );
    };

    this.renderResult = render(
      <TestWrapper>
        <div data-testid="test-harness" />
      </TestWrapper>
    );
  }

  // Method to simulate answering a question
  answerItem(itemId: string, result: 'pass' | 'fail') {
    if (!this.currentState?.answer) {
      throw new Error('Assessment context not properly initialized');
    }

    // Find the item
    const item = ITEMS.find(i => i.id === itemId);
    if (!item) {
      throw new Error(`Item with id ${itemId} not found`);
    }

    // Simulate the answer wrapped in act()
    act(() => {
      this.currentState.answer(result);
    });
  }

  // Helper method to set current item index
  setCurrentItemIndex(index: number) {
    // This would need to be implemented based on the context structure
    // For now, we'll track it internally
  }

  // Get current assessment state
  getCurrentState() {
    return this.currentState;
  }

  // Check if delirium is present
  isDeliriumPresent(): boolean {
    return this.currentState?.deliriumPresent || false;
  }

  // Check if override is present
  isOverridePresent(): boolean {
    return this.currentState?.overridePresent || false;
  }

  // Get current features state
  getFeatures() {
    return this.currentState?.features || {};
  }

  // Get responses
  getResponses() {
    return this.currentState?.responses || {};
  }

  // Check if assessment is complete
  isComplete(): boolean {
    return this.currentState?.complete || false;
  }

  // Get current item
  getCurrentItem(): Item | null {
    return this.currentState?.currentItem || null;
  }

  // Reset assessment
  resetAssessment() {
    if (this.currentState?.resetAssessment) {
      act(() => {
        this.currentState.resetAssessment();
      });
    }
  }

  // Get state history for debugging
  getStateHistory() {
    return this.stateHistory;
  }

  // Clean up
  cleanup() {
    if (this.renderResult) {
      this.renderResult.unmount();
    }
  }
}

