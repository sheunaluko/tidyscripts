// Test Interface Component - Main orchestrator for test functionality

import React, { useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import * as tsw from 'tidyscripts_web';
import { useRaiStore } from '../../store/useRaiStore';
import { TestInputForm } from './TestInputForm';
import { TestProgressTracker } from './TestProgressTracker';
import { TestResultsTable } from './TestResultsTable';
import { ResultAnalysis } from './ResultAnalysis';
import { TestHistoryList } from './TestHistoryList';

const log = tsw.common.logger.get_logger({ id: 'TestInterface' });
const debug = tsw.common.util.debug;

// Sample test inputs for development/testing
const SAMPLE_INPUTS = {
  infertility_consultation: {
    template: `{{ @age yo female | Female }} w/ {{ @reason_for_presentation | infertility consultation }}. {{ Hx notable for @significant_past_medical_history. | }}

- Discussed potential etiologies of infertility. Discussed components of the infertility eval including uterine/tubal assessment, semen analysis, ovarian reserve testing.

- Reviewed options ranging from least -> most intervention: natural cycle + timed intercourse, OI +/- IUI, IVF +/- PGT-A


1. Ovarian reserve: AFC {{ @follicle_count | [ ] }} , AMH {{ @AMH |  [ ] }}  , day 3 labs {{@day_3_labs |  [ ] }}
2. Ovulatory function: {{ @menstural_cycle_frequency | [ ] }}
3. Uterine cavity: TVUS {{ @ultrasound_findings | [ ] }} {{ @sis_needed? | [ ] schedule SIS | SIS deferred [ ] readdress prn }}
4. Tubal eval: {{HSG @HSG_findings |  }} {{ @HSG_need? | [ ] schedule HSG | HSG deferred [ ] readdress prn }}
5. Male eval: {{ SA @semen_analysis | [ ] schedule SA }} [ ] checklist labs
6. Genetics: {{ @genetic_screen_findings | [ ] genetic carrier screening x2}}
7. Checklist labs: {{ @checklist_labs_results | [ ] f/u ID panel, CBC, immunization titers, T&S }}
8. Other endocrine: {{ TSH @TSH_results, prolactin @prolactin_results |  [ ] f/u TSH, prolactin }}
9. Health maintenance: {{ @pap_up_to_date? | pap up to date  | [ ] needs updated pap}}`,
    input: `32 year old female presents with primary infertility for 18 months. She has regular cycles every 28-30 days. Partner semen analysis showed normal parameters - 45 million/mL with 60% motility and 8% normal morphology.

Past medical history significant for hypothyroidism on levothyroxine, well controlled.

Physical exam: BMI 24, vitals stable. Pelvic exam unremarkable.

Ultrasound today showed normal anteverted uterus, endometrial thickness 8mm, right ovary with 12 antral follicles, left ovary with 10 antral follicles. No fibroids or ovarian masses.

Labs today:
- AMH: 3.2 ng/mL
- Day 3 FSH: 6.8 mIU/mL, LH: 4.2 mIU/mL, E2: 45 pg/mL
- TSH: 2.1 (on levothyroxine)
- Prolactin: 12 ng/mL

She reports last Pap smear was 6 months ago, normal. Up to date on vaccinations.

Genetic carrier screening completed for both partners - both negative for common mutations.

Plan discussed:
1. Given regular cycles, normal ovarian reserve, and normal semen analysis, recommended HSG to evaluate tubal patency
2. She does need saline infusion sonogram 
3. All checklist labs completed
4. Discussed starting with timed intercourse this cycle, then consider ovulation induction with IUI if no success in 3 months
5. Reviewed IVF as option if simpler interventions unsuccessful

Patient counseled on optimizing lifestyle factors and taking prenatal vitamins. Follow up after HSG results.`
  },
};

declare global {
  interface Window {
    test_inputs: typeof SAMPLE_INPUTS;
  }
}

export const TestInterface: React.FC = () => {
  const {
    currentTestRun,
    isRunningTest,
    loadTestHistory,
  } = useRaiStore();

  // Load test history on mount and expose test inputs
  useEffect(() => {
    log('TestInterface mounted - loading test history');
    debug.add('test_interface_mounted', {});
    loadTestHistory();

    // Expose sample inputs to window for easy testing
    window.test_inputs = SAMPLE_INPUTS;
    log('Sample test inputs exposed to window.test_inputs');
  }, [loadTestHistory]);

  const hasResults = currentTestRun && currentTestRun.results.length > 0;
  const hasSuccessfulResults = currentTestRun && currentTestRun.results.some(r => r.status === 'success');

  log({
    msg: 'Render',
    isRunningTest,
    hasCurrentRun: !!currentTestRun,
    hasResults,
    hasSuccessfulResults,
  });

  return (
    <Box>
      {/* Header */}
      <Typography variant="h4" gutterBottom>
        Test Interface
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Compare note generation across multiple AI models with caching and analysis
      </Typography>

      {/* Test Input Form */}
      <TestInputForm />

      {/* Progress Tracker (shown during test execution) */}
      {isRunningTest && currentTestRun && currentTestRun.results.length > 0 && (
        <TestProgressTracker results={currentTestRun.results} />
      )}

      {/* Results and Analysis (shown after test completion) */}
      {hasResults && !isRunningTest && (
        <>
          <TestResultsTable results={currentTestRun.results} />

          {hasSuccessfulResults && (
            <ResultAnalysis testRunId={currentTestRun.id} />
          )}
        </>
      )}

      {/* Test History */}
      <TestHistoryList />
    </Box>
  );
};
