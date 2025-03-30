import React, { createContext, useContext, useState, useMemo } from "react";
import { ITEMS } from "./new_items";
import { Item } from "./types";

type FeatureMap = { [key: string]: boolean };
type ResponseMap = { [feature: string]: { [itemId: string]: "pass" | "fail" } };

type AssessmentContextType  = any ;


const AssessmentContext = createContext<AssessmentContextType | null>(null);

export const AssessmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {


  const [index, setIndex] = useState(0);
  const [features, setFeatures] = useState<FeatureMap>({
    "1": false,
    "2": false,
    "3": false,
      "4": false,
      "Override" : false , 
  });
  const [responses, setResponses] = useState<ResponseMap>({});
  const [patientId, setPatientId] = useState("RM 00") ; 
    const [showDiagram, setShowDiagram] = useState(false) ;
  const [complete, setComplete] = useState(false) ;    

    
  const currentItem = ITEMS[index];


const resetAssessment = () => {
  setIndex(0);
  setFeatures({
    "1": false,
    "2": false,
    "3": false,
    "4": false,
    "Override": false,
  });
  setResponses({});
    setShowDiagram(false);
    setPatientId("RM 00");
    setComplete(false) ; 
};
    
  const record_response = (item: Item, result: "pass" | "fail") => {
      const feature = item.feature?.replace("feature", "") ?? "none";

      console.log(feature)

    if (feature !== "none") {
      setResponses(prev => ({
        ...prev,
        [feature]: {
          ...(prev[feature] || {}),
          [item.id]: result,
        },
      }));

      if (result === "fail") {
        setFeatures(prev => ({ ...prev, [feature]: true }));
      } else {
          setFeatures(prev => ({ ...prev}) )
      }
    }
  };


    React.useEffect( ()=> {
	
	if ( JSON.stringify(responses) == "{}" ) {
	    console.log("skipping update because no responses :)")
	    return 
	}
	
	setIndex( prev=> {
	    let nxt = get_next_index(prev)
	    if (nxt >= ITEMS.length) {
		console.log("END OF Questions")
		setComplete(true) 
		return prev 
	    } else {
		return nxt 
	    }
	    
	})

	
    }, [features])

    React.useEffect( ()=> {

	console.log(`index=${index}`)
	console.log(currentItem) 

	if ( currentItem.type.match(/display|override/) ) {
	    setShowDiagram(false)
	} else {
	    setShowDiagram(true)	    
	}
	

    }, [index])
    
    
    
  const get_next_index = (startIndex: number): number => {
    let nextIndex = startIndex + 1;

    while (nextIndex < ITEMS.length) {
      const candidate = ITEMS[nextIndex];
      const featureNum = candidate.feature?.replace("feature", "");
      const shouldSkip = featureNum && features[featureNum];

      if (shouldSkip) {
        console.log(`Skipping item ${candidate.id} — feature ${featureNum} already positive`);
        nextIndex++;
      } else {
        break;
      }
    }

      return nextIndex

  };

  const answer = (result: "pass" | "fail") => {
    const item = ITEMS[index];
    record_response(item, result);

  };

  const deliriumPresent = useMemo(() => {
    let CAM =  (
      features["1"] &&
      features["2"] &&
      (features["3"] || features["4"])
    );

      let Override = features["Override"]

      let val = ( CAM || Override )
      if (val) { console.log( `delirium positive -> CAM=${CAM}, Override=${Override}`) } 
      return val

      
  }, [features]);

  return (
    <AssessmentContext.Provider
      value={{
        currentItem: ITEMS[index],
        answer,
        features,
        deliriumPresent,
          responses,
	  patientId,
	  setPatientId ,
	  showDiagram,
	  setShowDiagram ,
	  complete ,
	  resetAssessment, 
      }}
    >
      {children}
    </AssessmentContext.Provider>
  );
};

export const useAssessment = () => {
  const context = useContext(AssessmentContext);
  if (!context) throw new Error("useAssessment must be used inside AssessmentProvider");
  return context;
};
