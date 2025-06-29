import './deliriumDiagnosis.test';
import { TestHarness } from './testHarness';

/**
 * v2: Exhaustive question-level failure tests for each CAM feature,
 * verifying feature flagging and skip logic for all questions.
 */
describe('Exhaustive feature question failure cases (v2)', () => {
    let testHarness: TestHarness;
    beforeEach(() => {
	testHarness = new TestHarness();
    });
    afterEach(() => {
	testHarness.cleanup();
    });

    describe('Feature 3 question-level failures', () => {
	test('should mark feature3 positive and skip question 3 when feature3_q2 fails', () => {
	    testHarness.answerItem('severe_lethargy_ams', 'pass');
	    testHarness.answerItem('display1', 'pass');
	    testHarness.answerItem('feature3_q1', 'pass');
	    testHarness.answerItem('feature3_q2', 'fail');
	    expect(testHarness.getFeatures()['3']).toBe(true);
	    const current = testHarness.getCurrentItem();
	    expect(current?.id).not.toBe('feature3_q3');
	    expect(current?.feature).toBe('feature2');
	});

	test('should mark feature3 positive and advance to feature2 when feature3_q3 fails', () => {
	    testHarness.answerItem('severe_lethargy_ams', 'pass');
	    testHarness.answerItem('display1', 'pass');
	    testHarness.answerItem('feature3_q1', 'pass');
	    testHarness.answerItem('feature3_q2', 'pass');
	    testHarness.answerItem('feature3_q3', 'fail');
	    expect(testHarness.getFeatures()['3']).toBe(true);
	    const current = testHarness.getCurrentItem();
	    expect(current?.feature).toBe('feature2');
	});
    });

    describe('Feature 2 question-level failures', () => {
	test('should mark feature2 positive and skip questions 3 and 4 when feature2_q2 fails', () => {
	    testHarness.answerItem('severe_lethargy_ams', 'pass');
	    testHarness.answerItem('display1', 'pass');
	    // complete F3 negative
	    testHarness.answerItem('feature3_q1', 'pass');
	    testHarness.answerItem('feature3_q2', 'pass');
	    testHarness.answerItem('feature3_q3', 'pass');
	    testHarness.answerItem('feature2_q1', 'pass');
	    testHarness.answerItem('feature2_q2', 'fail');
	    expect(testHarness.getFeatures()['2']).toBe(true);
	    const current = testHarness.getCurrentItem();
	    expect(current?.id).not.toBe('feature2_q3');
	    expect(current?.id).not.toBe('feature2_q4');
	    expect(current?.feature).toBe('feature1');
	});

	test('should mark feature2 positive and skip question 4 when feature2_q3 fails', () => {
	    testHarness.answerItem('severe_lethargy_ams', 'pass');
	    testHarness.answerItem('display1', 'pass');
	    testHarness.answerItem('feature3_q1', 'pass');
	    testHarness.answerItem('feature3_q2', 'pass');
	    testHarness.answerItem('feature3_q3', 'pass');
	    testHarness.answerItem('feature2_q1', 'pass');
	    testHarness.answerItem('feature2_q2', 'pass');
	    testHarness.answerItem('feature2_q3', 'fail');
	    expect(testHarness.getFeatures()['2']).toBe(true);
	    const current = testHarness.getCurrentItem();
	    expect(current?.id).not.toBe('feature2_q4');
	    expect(current?.feature).toBe('feature1');
	});

	test('should mark feature2 positive and advance to feature1 when feature2_q4 fails', () => {
	    testHarness.answerItem('severe_lethargy_ams', 'pass');
	    testHarness.answerItem('display1', 'pass');
	    testHarness.answerItem('feature3_q1', 'pass');
	    testHarness.answerItem('feature3_q2', 'pass');
	    testHarness.answerItem('feature3_q3', 'pass');
	    testHarness.answerItem('feature2_q1', 'pass');
	    testHarness.answerItem('feature2_q2', 'pass');
	    testHarness.answerItem('feature2_q3', 'pass');
	    testHarness.answerItem('feature2_q4', 'fail');
	    expect(testHarness.getFeatures()['2']).toBe(true);
	    const current = testHarness.getCurrentItem();
	    expect(current?.feature).toBe('feature1');
	});
    });

    describe('Feature 1 question-level failures', () => {
	test('should mark feature1 positive and skip question 3 when feature1_q2 fails', () => {
	    testHarness.answerItem('severe_lethargy_ams', 'pass');
	    testHarness.answerItem('display1', 'pass');
	    testHarness.answerItem('feature3_q1', 'pass');
	    testHarness.answerItem('feature3_q2', 'pass');
	    testHarness.answerItem('feature3_q3', 'pass');
	    testHarness.answerItem('feature2_q1', 'pass');
	    testHarness.answerItem('feature2_q2', 'pass');
	    testHarness.answerItem('feature2_q3', 'pass');
	    testHarness.answerItem('feature2_q4', 'pass');
	    testHarness.answerItem('feature1_q1', 'pass');
	    testHarness.answerItem('feature1_q2', 'fail');
	    expect(testHarness.getFeatures()['1']).toBe(true);
	    const current = testHarness.getCurrentItem();
	    expect(current?.id).not.toBe('feature1_q3');
	    expect(current?.id).toBe('display2');
	});

	test('should mark feature1 positive and advance to display2 when feature1_q3 fails', () => {
	    testHarness.answerItem('severe_lethargy_ams', 'pass');
	    testHarness.answerItem('display1', 'pass');
	    testHarness.answerItem('feature3_q1', 'pass');
	    testHarness.answerItem('feature3_q2', 'pass');
	    testHarness.answerItem('feature3_q3', 'pass');
	    testHarness.answerItem('feature2_q1', 'pass');
	    testHarness.answerItem('feature2_q2', 'pass');
	    testHarness.answerItem('feature2_q3', 'pass');
	    testHarness.answerItem('feature2_q4', 'pass');
	    testHarness.answerItem('feature1_q1', 'pass');
	    testHarness.answerItem('feature1_q2', 'pass');
	    testHarness.answerItem('feature1_q3', 'fail');
	    expect(testHarness.getFeatures()['1']).toBe(true);
	    const current = testHarness.getCurrentItem();
	    expect(current?.id).toBe('display2');
	});
    });

    describe('Feature 4 question-level failures', () => {
	test('should mark feature4 positive and skip observation2 when feature4_obs1 fails', () => {
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


	    testHarness.answerItem('display2', 'pass');
	    testHarness.answerItem('feature4_obs1', 'fail');
	    expect(testHarness.getFeatures()['4']).toBe(true);
	    const current = testHarness.getCurrentItem();
	    expect(current?.id).not.toBe('feature4_obs2');
	    expect(current?.id).toBe('feature3_obs1');
	});

	test('should mark feature4 positive and advance to feature3 observations when feature4_obs2 fails', () => {
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

	    
	    
	    testHarness.answerItem('display2', 'pass');
	    testHarness.answerItem('feature4_obs1', 'pass');
	    testHarness.answerItem('feature4_obs2', 'fail');
	    expect(testHarness.getFeatures()['4']).toBe(true);
	    const current = testHarness.getCurrentItem();
	    expect(current?.id).toBe('feature3_obs1');
	});
    });
});
