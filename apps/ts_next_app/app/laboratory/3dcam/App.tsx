"use client" ; 

import React, { useState } from "react";
import { Typography , Container, Box, Tabs, Tab } from "@mui/material";
import AssessmentScreen from "./AssessmentScreen";
import SummaryScreen from "./SummaryScreen";
import PastAssessments from "./PastAssessments";



const App: React.FC = () => {
  const [tabIndex, setTabIndex] = useState(0);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  return (
    <Box
      maxWidth="md"
	style={{
	    height: "100%" ,
	    padding : "4%", 
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >

	<Typography variant="h6"  align="center" paddingBottom="10%">
	    3D-CAM DELIRIUM ASSESSMENT 
	</Typography>
	
      {/* Navigation Tabs */}
      <Tabs
        value={tabIndex}
        onChange={(_, newIndex) => setTabIndex(newIndex)}
        indicatorColor="primary"
        textColor="primary"
          variant="fullWidth"

      >
        <Tab label="Assessment" />
        <Tab label="Summary" />
        <Tab label="Past Assessments" />
      </Tabs>

      {/* Tab Content with Fixed Height */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {tabIndex === 0 && <AssessmentScreen setSelectedPatientId={setSelectedPatientId} setTabIndex={setTabIndex} />}
        {tabIndex === 1 && <SummaryScreen selectedPatientId={selectedPatientId} />}
        {tabIndex === 2 && <PastAssessments setSelectedPatientId={setSelectedPatientId} setTabIndex={setTabIndex} />}
      </div>
    </Box>
  );
};

export default App;
