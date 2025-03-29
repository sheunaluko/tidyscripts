import { useState, useEffect } from "react";
import { DeliriumAssessment, AssessmentStatus } from "./assessment";
import { Item } from "./types";
import { ITEMS } from "./items";

export function useAssessment() {
  const [assessment] = useState(() => new DeliriumAssessment());
  const [currentItem, setCurrentItem] = useState<Item | undefined>(undefined);
  const [status, setStatus] = useState<AssessmentStatus | null>(null);

  useEffect(() => {
    assessment.initAssessment(ITEMS);
    setCurrentItem(assessment.get_next_question());
    setStatus(assessment.get_status());
  }, [assessment]);

  const answer = (id: string, pass: boolean) => {
    assessment.answer_question(id, pass);
    setCurrentItem(assessment.get_next_question());
    setStatus(assessment.get_status());
  };

  return {
    currentItem,
    status,
    answer
  };
}
