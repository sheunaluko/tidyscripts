import { AssessmentResult } from "./types";

const STORAGE_KEY = "assessments";

// Retrieve stored assessments from local storage
export function getAllAssessments(): AssessmentResult[] {
    const storedData = localStorage.getItem(STORAGE_KEY);
    return storedData ? JSON.parse(storedData) : [];
}

// Save an assessment to local storage
export function saveAssessment(assessment: AssessmentResult) {
    const storedAssessments = getAllAssessments();

    // Check if an assessment with the same patientId exists
    const existingIndex = storedAssessments.findIndex(a => a.patientId === assessment.patientId);
    
    if (existingIndex !== -1) {
	// Replace existing assessment
	storedAssessments[existingIndex] = assessment;
    } else {
	// Add new assessment
	storedAssessments.push(assessment);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedAssessments));

}

// Retrieve a specific assessment by patient ID
export function getAssessment(patientId: string): AssessmentResult | null {
    const assessments = getAllAssessments();
    return assessments.find((assessment) => assessment.patientId === patientId) || null;
}


