import { z } from "zod";
import { zodResponseFormat } from 'openai/helpers/zod';

// Zod schema for structured verification report
export const VerificationReportSchema = z.object({
  original: z.array(z.string()).describe("Clinical facts that appear in both documents, either unchanged or with minimal transformation"),
  transformed: z.array(z.string()).describe("Clinical facts from the original that were significantly rephrased, had tense changes, or were restructured but preserve the same clinical meaning"),
  inferred: z.array(z.string()).describe("Information in the discharge summary that was NOT explicitly stated in the original progress note (assumptions, placeholders like ***, or added context)"),
  missing: z.array(z.string()).describe("Important clinical information from the original progress note that did NOT make it into the discharge summary")
});

export type VerificationReport = z.infer<typeof VerificationReportSchema>;

export const verificationResponseFormat = zodResponseFormat(
  VerificationReportSchema,
  'verification_report'
);

// Version tracking
export interface SummaryVersion {
  id: string;
  text: string;
  timestamp: Date;
  versionNumber: number;
}

// Verification state for checkboxes
export interface VerificationState {
  inferredToRemove: Set<number>;
  missingToAdd: Set<number>;
}
