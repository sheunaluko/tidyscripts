import { useState } from 'react';
import * as tsw from "tidyscripts_web";
import * as fb from "../../../../src/firebase";
import { CONVERSION_INSTRUCTIONS } from '../instructions';
import { DEFAULT_MODEL, VERBOSITY_LABELS, VERBOSITY_GUIDANCE } from '../constants';
import {
  VerificationReport,
  verificationResponseFormat,
  SummaryVersion,
  VerificationState
} from '../types';

const log = tsw.common.logger.get_logger({ id: "wrangler" });
const debug = tsw.common.util.debug;

const ai_client = fb.create_wrapped_client({
  app_id: "note_wrangler",
  origin_id: "general",
  log
});

const ai_structured_client = fb.create_wrapped_structured_client({
  app_id: "note_wrangler",
  origin_id: "structured",
  log
});

export const useNoteConversion = () => {
  const [progressNote, setProgressNote] = useState('');
  const [verbosity, setVerbosity] = useState(3);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [versions, setVersions] = useState<SummaryVersion[]>([]);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(0);
  const [verificationReport, setVerificationReport] = useState<VerificationReport | null>(null);
  const [verificationState, setVerificationState] = useState<VerificationState>({
    inferredToRemove: new Set(),
    missingToAdd: new Set()
  });
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const buildPrompt = (note: string, verbosityLevel: number): string => {
    return `${CONVERSION_INSTRUCTIONS}

VERBOSITY LEVEL: ${verbosityLevel}/5 (${VERBOSITY_LABELS[verbosityLevel as keyof typeof VERBOSITY_LABELS]})
${VERBOSITY_GUIDANCE[verbosityLevel as keyof typeof VERBOSITY_GUIDANCE]}

Please convert the following progress note into a discharge summary following all the transformation principles outlined above.

PROGRESS NOTE:
${note}

Please provide the discharge summary now:`;
  };

  const buildRegenerationPrompt = (
    originalNote: string,
    currentSummary: string,
    inferredToRemove: string[],
    missingToAdd: string[],
    verbosityLevel: number
  ): string => {
    let corrections = '';

    if (inferredToRemove.length > 0) {
      corrections += '\n\nREMOVE THE FOLLOWING INFERRED/ASSUMED INFORMATION:\n';
      inferredToRemove.forEach((item, i) => {
        corrections += `${i + 1}. ${item}\n`;
      });
    }

    if (missingToAdd.length > 0) {
      corrections += '\n\nADD THE FOLLOWING MISSING INFORMATION FROM THE ORIGINAL NOTE:\n';
      missingToAdd.forEach((item, i) => {
        corrections += `${i + 1}. ${item}\n`;
      });
    }

    return `${CONVERSION_INSTRUCTIONS}

VERBOSITY LEVEL: ${verbosityLevel}/5 (${VERBOSITY_LABELS[verbosityLevel as keyof typeof VERBOSITY_LABELS]})
${VERBOSITY_GUIDANCE[verbosityLevel as keyof typeof VERBOSITY_GUIDANCE]}

ORIGINAL PROGRESS NOTE:
${originalNote}

CURRENT DISCHARGE SUMMARY:
${currentSummary}

CORRECTIONS NEEDED:
${corrections}

Please regenerate the discharge summary with the above corrections applied. Follow all transformation principles, and make sure to remove the inferred items and add the missing items as specified.

Please provide the corrected discharge summary now:`;
  };

  const generateSummary = async () => {
    if (!progressNote.trim()) {
      setError('Please enter a progress note to convert');
      return;
    }

    setLoading(true);
    setError('');
    setVersions([]);
    setVerificationReport(null);
    setVerificationState({ inferredToRemove: new Set(), missingToAdd: new Set() });
    setActiveTab(0);
    setCurrentVersionIndex(0);

    try {
      const prompt = buildPrompt(progressNote, verbosity);

      const response = await ai_client.chat.completions.create({
        model: model,
        messages: [
          { role: 'system', content: 'You are an expert medical documentation assistant specializing in converting progress notes to discharge summaries.' },
          { role: 'user', content: prompt }
        ]
      });

      const content = response.choices[0].message.content;
      debug.add("discharge_summary_output", content);

      if (content) {
        const newVersion: SummaryVersion = {
          id: `v1-${Date.now()}`,
          text: content,
          timestamp: new Date(),
          versionNumber: 1
        };
        setVersions([newVersion]);
        setCurrentVersionIndex(0);

        // Run structured verification
        runVerification(progressNote, content);
      } else {
        setError('No output generated');
      }
    } catch (err: any) {
      log('Error converting note:');
      log(err);
      setError(err?.message || 'An error occurred during conversion');
    } finally {
      setLoading(false);
    }
  };

  const runVerification = async (originalNote: string, dischargeSummary: string) => {
    setVerifying(true);
    setVerificationReport(null);

    try {
      const verificationPrompt = `You are a medical documentation verification assistant. Compare the original progress note with the generated discharge summary and categorize every clinical fact.

ORIGINAL PROGRESS NOTE:
${originalNote}

GENERATED DISCHARGE SUMMARY:
${dischargeSummary}

Analyze both documents and categorize clinical information into:

1. original - Clinical facts that appear in both documents (unchanged or minimally transformed)
2. transformed - Clinical facts significantly rephrased/restructured but preserving clinical meaning
3. inferred - Information in the discharge summary NOT explicitly in the original note (assumptions, placeholders, added context)
4. missing - Important clinical information from the original that did NOT make it into the discharge summary

Be thorough and specific. List each clinical fact as a separate item.`;

      const response = await ai_structured_client.beta.chat.completions.parse({
        model: model,
        messages: [
          { role: 'system', content: 'You are a medical documentation verification assistant. Be thorough, specific, and focus on clinical accuracy.' },
          { role: 'user', content: verificationPrompt }
        ],
        response_format: verificationResponseFormat
      });

      const parsedContent = JSON.parse(response.choices[0].message.content || '{}');
      debug.add("structured_verification_report", parsedContent);

      setVerificationReport(parsedContent as VerificationReport);
    } catch (err: any) {
      log('Error generating verification report:');
      log(err);
      setError('Failed to generate verification report: ' + (err?.message || 'Unknown error'));
    } finally {
      setVerifying(false);
    }
  };

  const regenerateSummary = async () => {
    if (!verificationReport || versions.length === 0) return;

    const currentVersion = versions[currentVersionIndex];
    const inferredToRemove = Array.from(verificationState.inferredToRemove)
      .map(idx => verificationReport.inferred[idx]);
    const missingToAdd = Array.from(verificationState.missingToAdd)
      .map(idx => verificationReport.missing[idx]);

    if (inferredToRemove.length === 0 && missingToAdd.length === 0) {
      setError('Please select items to remove or add before regenerating');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const prompt = buildRegenerationPrompt(
        progressNote,
        currentVersion.text,
        inferredToRemove,
        missingToAdd,
        verbosity
      );

      const response = await ai_client.chat.completions.create({
        model: model,
        messages: [
          { role: 'system', content: 'You are an expert medical documentation assistant. Apply the requested corrections precisely.' },
          { role: 'user', content: prompt }
        ]
      });

      const content = response.choices[0].message.content;
      debug.add("regenerated_summary_output", content);

      if (content) {
        const newVersion: SummaryVersion = {
          id: `v${versions.length + 1}-${Date.now()}`,
          text: content,
          timestamp: new Date(),
          versionNumber: versions.length + 1
        };
        const updatedVersions = [...versions, newVersion];
        setVersions(updatedVersions);
        setCurrentVersionIndex(updatedVersions.length - 1);
        setVerificationState({ inferredToRemove: new Set(), missingToAdd: new Set() });
        setActiveTab(0);

        // Run new verification
        runVerification(progressNote, content);
      } else {
        setError('No output generated');
      }
    } catch (err: any) {
      log('Error regenerating summary:');
      log(err);
      setError(err?.message || 'An error occurred during regeneration');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToClipboard = async () => {
    if (versions.length === 0) return;

    try {
      await navigator.clipboard.writeText(versions[currentVersionIndex].text);
      setCopySuccess(true);
    } catch (err) {
      log('Failed to copy to clipboard:');
      log(err);
      setError('Failed to copy to clipboard');
    }
  };

  const toggleInferredItem = (index: number) => {
    setVerificationState(prev => {
      const newSet = new Set(prev.inferredToRemove);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return { ...prev, inferredToRemove: newSet };
    });
  };

  const toggleMissingItem = (index: number) => {
    setVerificationState(prev => {
      const newSet = new Set(prev.missingToAdd);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return { ...prev, missingToAdd: newSet };
    });
  };

  return {
    // State
    progressNote,
    verbosity,
    model,
    versions,
    currentVersionIndex,
    verificationReport,
    verificationState,
    loading,
    verifying,
    error,
    copySuccess,
    activeTab,

    // Setters
    setProgressNote,
    setVerbosity,
    setModel,
    setCurrentVersionIndex,
    setError,
    setCopySuccess,
    setActiveTab,

    // Actions
    generateSummary,
    regenerateSummary,
    handleCopyToClipboard,
    toggleInferredItem,
    toggleMissingItem
  };
};
