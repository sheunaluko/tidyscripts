import { TestHarness } from './testHarness';

describe('3D-CAM Delirium Diagnosis Logic', () => {
  let testHarness: TestHarness;

  beforeEach(() => {
    testHarness = new TestHarness();
  });

  afterEach(() => {
    testHarness.cleanup();
  });

  describe('Override Logic', () => {
    test('should diagnose delirium when severe AMS override is positive', () => {
      testHarness.answerItem('severe_lethargy_ams', 'fail');
      
      expect(testHarness.isDeliriumPresent()).toBe(true);
      expect(testHarness.isOverridePresent()).toBe(true);
    });

    test('should not diagnose delirium when severe AMS override is negative', () => {
      testHarness.answerItem('severe_lethargy_ams', 'pass');
      
      expect(testHarness.isOverridePresent()).toBe(false);
      // Should continue with normal assessment
    });
  });

  describe('Core CAM Algorithm: F1 + F2 + (F3 OR F4)', () => {
    test('should diagnose delirium with F1+F2+F3 positive', async () => {
      // Start assessment
      testHarness.answerItem('severe_lethargy_ams', 'pass'); // No override
      testHarness.answerItem('display1', 'pass'); // Continue
      
      // Make Feature 3 positive (Disorganized Thinking)
      testHarness.answerItem('feature3_q1', 'fail'); // First fail should make F3 positive
      
      // Make Feature 2 positive (Inattention) 
      testHarness.answerItem('feature2_q1', 'fail'); // First fail should make F2 positive
      
      // Make Feature 1 positive (Acute Change)
      testHarness.answerItem('feature1_q1', 'fail'); // First fail should make F1 positive
      
      // Continue through the assessment flow to reach F4 observations
      testHarness.answerItem('display2', 'pass'); // Interviewer ratings section
      
      // Complete Feature 4 observations (required for diagnosis even if F3 positive)
      testHarness.answerItem('feature4_obs1', 'pass');
      testHarness.answerItem('feature4_obs2', 'pass');
      
      const features = testHarness.getFeatures();
      expect(features['1']).toBe(true); // F1 positive
      expect(features['2']).toBe(true); // F2 positive  
      expect(features['3']).toBe(true); // F3 positive
      expect(testHarness.isDeliriumPresent()).toBe(true);
    });

    test('should diagnose delirium with F1+F2+F4 positive (F3 negative)', () => {
      testHarness.answerItem('severe_lethargy_ams', 'pass'); // No override
      testHarness.answerItem('display1', 'pass');
      
      // Keep Feature 3 negative (all pass)
      testHarness.answerItem('feature3_q1', 'pass');
      testHarness.answerItem('feature3_q2', 'pass'); 
      testHarness.answerItem('feature3_q3', 'pass');
      
      // Make Feature 2 positive
      testHarness.answerItem('feature2_q1', 'fail');
      
      // Make Feature 1 positive
      testHarness.answerItem('feature1_q1', 'fail');
      
      // Continue to F4 observations section
      testHarness.answerItem('display2', 'pass');
      
      // Make Feature 4 positive
      testHarness.answerItem('feature4_obs1', 'fail'); // This should make F4 positive
      testHarness.answerItem('feature4_obs2', 'pass');
      
      const features = testHarness.getFeatures();
      expect(features['1']).toBe(true); // F1 positive
      expect(features['2']).toBe(true); // F2 positive
      expect(features['3']).toBe(false); // F3 negative
      expect(features['4']).toBe(true); // F4 positive
      expect(testHarness.isDeliriumPresent()).toBe(true);
    });

    test('should NOT diagnose delirium when missing F1', () => {
      testHarness.answerItem('severe_lethargy_ams', 'pass');
      testHarness.answerItem('display1', 'pass');
      
      // Feature 3 positive
      testHarness.answerItem('feature3_q1', 'fail');
      
      // Feature 2 positive  
      testHarness.answerItem('feature2_q1', 'fail');
      
      // Feature 1 NEGATIVE (all pass)
      testHarness.answerItem('feature1_q1', 'pass');
      testHarness.answerItem('feature1_q2', 'pass');
      testHarness.answerItem('feature1_q3', 'pass');
      
      // Continue to F4 section
      testHarness.answerItem('display2', 'pass');
      
      // Complete F4
      testHarness.answerItem('feature4_obs1', 'pass');
      testHarness.answerItem('feature4_obs2', 'pass');
      
      const features = testHarness.getFeatures();
      expect(features['1']).toBe(false); // F1 negative
      expect(features['2']).toBe(true);  // F2 positive
      expect(features['3']).toBe(true);  // F3 positive
      expect(testHarness.isDeliriumPresent()).toBe(false); // Missing F1
    });

    test('should NOT diagnose delirium when missing F2', () => {
      testHarness.answerItem('severe_lethargy_ams', 'pass');
      testHarness.answerItem('display1', 'pass');
      
      // Feature 3 positive
      testHarness.answerItem('feature3_q1', 'fail');
      
      // Feature 2 NEGATIVE (all pass)
      testHarness.answerItem('feature2_q1', 'pass');
      testHarness.answerItem('feature2_q2', 'pass');
      testHarness.answerItem('feature2_q3', 'pass');
      testHarness.answerItem('feature2_q4', 'pass');
      
      // Feature 1 positive
      testHarness.answerItem('feature1_q1', 'fail');
      
      // Continue to F4 section
      testHarness.answerItem('display2', 'pass');
      
      // Complete F4
      testHarness.answerItem('feature4_obs1', 'pass');
      testHarness.answerItem('feature4_obs2', 'pass');
      
      const features = testHarness.getFeatures();
      expect(features['1']).toBe(true);  // F1 positive
      expect(features['2']).toBe(false); // F2 negative
      expect(features['3']).toBe(true);  // F3 positive
      expect(testHarness.isDeliriumPresent()).toBe(false); // Missing F2
    });

    test('should NOT diagnose delirium when missing both F3 and F4', () => {
      testHarness.answerItem('severe_lethargy_ams', 'pass');
      testHarness.answerItem('display1', 'pass');
      
      // Feature 3 NEGATIVE (all pass)
      testHarness.answerItem('feature3_q1', 'pass');
      testHarness.answerItem('feature3_q2', 'pass');
      testHarness.answerItem('feature3_q3', 'pass');
      
      // Feature 2 positive
      testHarness.answerItem('feature2_q1', 'fail');
      
      // Feature 1 positive
      testHarness.answerItem('feature1_q1', 'fail');
      
      // Continue to F4 section
      testHarness.answerItem('display2', 'pass');
      
      // Feature 4 NEGATIVE (all pass)
      testHarness.answerItem('feature4_obs1', 'pass');
      testHarness.answerItem('feature4_obs2', 'pass');
      
      const features = testHarness.getFeatures();
      expect(features['1']).toBe(true);  // F1 positive
      expect(features['2']).toBe(true);  // F2 positive
      expect(features['3']).toBe(false); // F3 negative
      expect(features['4']).toBe(false); // F4 negative
      expect(testHarness.isDeliriumPresent()).toBe(false); // Missing F3 AND F4
    });
  });

  describe('Skip Logic', () => {
    test('should skip remaining F3 questions when first F3 question fails', () => {
      testHarness.answerItem('severe_lethargy_ams', 'pass');
      testHarness.answerItem('display1', 'pass');
      testHarness.answerItem('feature3_q1', 'fail'); // F3 now positive
      
      // Should skip to F2 questions, not show feature3_q2
      const currentItem = testHarness.getCurrentItem();
      expect(currentItem?.id).not.toBe('feature3_q2');
      expect(currentItem?.feature).toBe('feature2'); // Should jump to F2
    });

    test('should skip remaining F2 questions when first F2 question fails', () => {
      testHarness.answerItem('severe_lethargy_ams', 'pass');
      testHarness.answerItem('display1', 'pass');
      testHarness.answerItem('feature3_q1', 'fail'); // F3 positive
      testHarness.answerItem('feature2_q1', 'fail'); // F2 now positive
      
      // Should skip to F1 questions
      const currentItem = testHarness.getCurrentItem();
      expect(currentItem?.feature).toBe('feature1');
    });
  });

  describe('Feature 4 Special Logic', () => {
    test('should require both F4 observations to be processed before diagnosis', () => {
      testHarness.answerItem('severe_lethargy_ams', 'pass');
      testHarness.answerItem('display1', 'pass');
      testHarness.answerItem('feature3_q1', 'fail'); // F3 positive
      testHarness.answerItem('feature2_q1', 'fail'); // F2 positive
      testHarness.answerItem('feature1_q1', 'fail'); // F1 positive
      testHarness.answerItem('display2', 'pass'); // Continue to F4 section
      
      // Only answer first F4 observation
      testHarness.answerItem('feature4_obs1', 'pass');
      
      // Should not diagnose yet - F4 not fully processed
      expect(testHarness.isDeliriumPresent()).toBe(false);
      
      // Answer second F4 observation
      testHarness.answerItem('feature4_obs2', 'pass');
      
      // Now should diagnose (F1+F2+F3, F4 processed)
      expect(testHarness.isDeliriumPresent()).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle all negative responses (no delirium)', () => {
      // Answer all questions with 'pass' (negative)
      testHarness.answerItem('severe_lethargy_ams', 'pass');
      testHarness.answerItem('display1', 'pass');
      
      // All F3 questions negative
      testHarness.answerItem('feature3_q1', 'pass');
      testHarness.answerItem('feature3_q2', 'pass');
      testHarness.answerItem('feature3_q3', 'pass');
      
      // All F2 questions negative
      testHarness.answerItem('feature2_q1', 'pass');
      testHarness.answerItem('feature2_q2', 'pass');
      testHarness.answerItem('feature2_q3', 'pass');
      testHarness.answerItem('feature2_q4', 'pass');
      
      // All F1 questions negative
      testHarness.answerItem('feature1_q1', 'pass');
      testHarness.answerItem('feature1_q2', 'pass');
      testHarness.answerItem('feature1_q3', 'pass');
      
      // Continue to interviewer observations
      testHarness.answerItem('display2', 'pass');
      
      // All F4 observations negative
      testHarness.answerItem('feature4_obs1', 'pass');
      testHarness.answerItem('feature4_obs2', 'pass');
      
      // All F3 observations negative
      testHarness.answerItem('feature3_obs1', 'pass');
      testHarness.answerItem('feature3_obs2', 'pass');
      testHarness.answerItem('feature3_obs3', 'pass');
      
      // All F2 observations negative
      testHarness.answerItem('feature2_obs1', 'pass');
      testHarness.answerItem('feature2_obs2', 'pass');
      
      // All F1 observations negative  
      testHarness.answerItem('feature1_obs1', 'pass');
      testHarness.answerItem('feature1_obs2', 'pass');
      testHarness.answerItem('feature1_obs3', 'pass');
      
      expect(testHarness.isDeliriumPresent()).toBe(false);
      expect(testHarness.isComplete()).toBe(true);
    });

    test('should maintain state consistency after reset', () => {
      // Set up some state
      testHarness.answerItem('severe_lethargy_ams', 'fail');
      expect(testHarness.isDeliriumPresent()).toBe(true);
      
      // Reset
      testHarness.resetAssessment();
      
      // Should be back to initial state
      expect(testHarness.isDeliriumPresent()).toBe(false);
      expect(testHarness.isOverridePresent()).toBe(false);
      expect(testHarness.isComplete()).toBe(false);
      
      const features = testHarness.getFeatures();
      Object.values(features).forEach(feature => {
        expect(feature).toBe(false);
      });
    });
  });
});