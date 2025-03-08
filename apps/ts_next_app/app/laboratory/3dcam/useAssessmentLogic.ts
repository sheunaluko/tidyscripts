import { useState, useEffect } from "react";
import { ITEMS } from "./items";
import { Item, ItemResponse, FeatureBreakdown, AssessmentResult } from "./types";

export function useAssessmentLogic() {
  const [responses, setResponses] = useState<ItemResponse[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [featureBreakdown, setFeatureBreakdown] = useState<Record<string, FeatureBreakdown>>({
    feature1: { value: false, subcomponents: {} },
    feature2: { value: false, subcomponents: {} },
    feature3: { value: false, subcomponents: {} },
    feature4: { value: false, subcomponents: {} },
  });

  function resetAssessment() {
    setResponses([]);
    setCurrentItemIndex(0);
    setFeatureBreakdown({
      feature1: { value: false, subcomponents: {} },
      feature2: { value: false, subcomponents: {} },
      feature3: { value: false, subcomponents: {} },
      feature4: { value: false, subcomponents: {} },
    });
  }

   // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect( ()=> {
	console.log("detected breakdown change...")
	if (responses.length < 1 ) {
	    console.log("Ignoring change due to no responses present") 
	    return 
	} 
	// Skip logic: If a feature is flagged as positive, move to the next feature
	const nextIndex = getNextItemIndex();
	setCurrentItemIndex(nextIndex);
    }, [featureBreakdown]) ; 
    
  function answerItem(itemId: string, value: boolean) {
    const newResponse = { itemId, value, timestamp: Date.now() };
    setResponses((prev) => [...prev, newResponse]);

    setFeatureBreakdown((prev) => {
      const updatedBreakdown = { ...prev };
      const currentItem = ITEMS.find((item) => item.id === itemId);
      if (currentItem) {
        updatedBreakdown[currentItem.feature].subcomponents = {
          ...updatedBreakdown[currentItem.feature].subcomponents,
          [itemId]: value,
        };
      }

      // Determine if the feature should be considered 'positive'
      for (const featureKey in updatedBreakdown) {
        updatedBreakdown[featureKey].value = Object.values(updatedBreakdown[featureKey].subcomponents).some(
          (val) => val === true
        );
      }
      console.log(updatedBreakdown) 
      return updatedBreakdown;
    });

  }

  function getNextItemIndex(): number {
    for (let i = currentItemIndex + 1; i < ITEMS.length; i++) {
      const nextItem = ITEMS[i];

      // Skip items from features that are already positive
      if (featureBreakdown[nextItem.feature].value) {
        continue;
      }

      // Return the first unanswered item from a feature that is still relevant
      if (!responses.some((res) => res.itemId === nextItem.id)) {
        return i;
      }
    }
    return ITEMS.length; // End assessment
  }

  function calculateDeliriumScore(patientId : string): AssessmentResult {
    const isDeliriumPresent =
      featureBreakdown.feature1.value &&
      featureBreakdown.feature2.value &&
      (featureBreakdown.feature3.value || featureBreakdown.feature4.value);

      return {
	  patientId, 
      responses,
      completedAt: Date.now(),
      deliriumScore: {
        feature1: { ...featureBreakdown.feature1 },
        feature2: { ...featureBreakdown.feature2 },
        feature3: { ...featureBreakdown.feature3 },
        feature4: { ...featureBreakdown.feature4 },
        isDeliriumPresent,
      },
    };
  }

  return {
    currentItem: ITEMS[currentItemIndex] || null,
    answerItem,
    calculateDeliriumScore,
    resetAssessment,
    isAssessmentComplete: currentItemIndex >= ITEMS.length,
  };
}
