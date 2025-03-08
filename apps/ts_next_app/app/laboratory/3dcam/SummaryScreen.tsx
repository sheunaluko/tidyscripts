import React, { useEffect, useState } from "react";
import { Container, Typography, Accordion, AccordionSummary, AccordionDetails, Tooltip } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { getAssessment } from "./useLocalStorage";
import { AssessmentResult, FeatureBreakdown } from "./types";
import {item_id_to_text} from "./items" ; 

const SummaryScreen: React.FC<{ selectedPatientId: string | null }> = ({ selectedPatientId }) => {
  const [assessment, setAssessment] = useState<AssessmentResult | null>(null);

  useEffect(() => {
    if (selectedPatientId) {
	const savedAssessment = getAssessment(selectedPatientId);
	console.log(savedAssessment)
      if (savedAssessment) {
        setAssessment(savedAssessment);
      }
    }
  }, [selectedPatientId]);

  if (!selectedPatientId) {
    return (
      <Container style={{ marginTop: "10%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Typography variant="h5" align="center">No patient selected. Please complete an assessment or select a past assessment.</Typography>
      </Container>
    );
  }

  if (!assessment) {
    return (
      <Container >
        <Typography variant="h5" align="center">No assessment found for this patient.</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" style={{ overflow: "auto" , paddingTop : "10%" }}>
      <Typography variant="h4" align="center" gutterBottom>
        Assessment Summary
      </Typography>
      <Typography variant="h6" align="center" >
        Patient ID: {selectedPatientId}
      </Typography>
      
      <Typography variant="h5" align="center" color={assessment.deliriumScore.isDeliriumPresent ? "error" : "primary"}>
        Delirium Present: {assessment.deliriumScore.isDeliriumPresent ? "Yes" : "No"}
      </Typography>
      

      {Object.entries(assessment.deliriumScore).map(([feature, breakdown]) =>
        feature !== "isDeliriumPresent" ? (
          <Accordion key={feature} style={{ marginTop: 10 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6" color={(breakdown as FeatureBreakdown).value ? "error" : "textPrimary" }>Feature {feature.replace("feature", "")}  </Typography>
            </AccordionSummary>
            <AccordionDetails>
		{Object.entries((breakdown as FeatureBreakdown).subcomponents).map(([itemId, value]) => {

		    let tmp = itemId.split("_")[1].replace("q","Question ").replace("obs", "Observation ")
		    tmp = tmp[0].toUpperCase() + tmp.slice(1) 
		    let hoverInfo = item_id_to_text(itemId) ; 
		    
		    return (
			<Tooltip title={hoverInfo} key={itemId} placement="top">
                <Typography key={itemId} color={value ? "error" : "textPrimary"}>
                  {tmp}: {value ? "Fail" : "Pass"}
                </Typography>
			</Tooltip> 
		    )
              })}
            </AccordionDetails>
          </Accordion>
        ) : null
      )}
    </Container>
  );
};

export default SummaryScreen;
