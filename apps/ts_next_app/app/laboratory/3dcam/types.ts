// Unique ID for each item (question or observation)
export type ItemId = string;

// Features in 3D-CAM
export type FeatureKey = "feature1" | "feature2" | "feature3" | "feature4";

// General structure for both assessment questions and observations
export interface Item {
  id: ItemId;
  text: string;
  feature: FeatureKey;
  type: "question" | "observation"; // Determines if it's a patient question or clinician observation
}

// Stores the response to any item (question or observation)
export interface ItemResponse {
  itemId: ItemId;
  value: boolean;
  timestamp: number;
}

// Breakdown of why a feature is positive/negative
export interface FeatureBreakdown {
  value: boolean; // Final determination
  subcomponents: { [itemId: string]: boolean }; // Stores responses contributing to this feature
}

// Stores the result of an assessment
export interface AssessmentResult {
  patientId: string;
  responses: ItemResponse[];
  completedAt: number;
  deliriumScore: {
    feature1: FeatureBreakdown;
    feature2: FeatureBreakdown;
    feature3: FeatureBreakdown;
    feature4: FeatureBreakdown;
    isDeliriumPresent: boolean;
  };
}
