import React, { useState } from "react";
import {
  Container,
  Typography,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemButton,  
} from "@mui/material";


import { getAllAssessments } from "./useLocalStorage";
import { AssessmentResult } from "./types";

const PastAssessments: React.FC<{
  setSelectedPatientId: (id: string) => void;
  setTabIndex: (i: number) => void;
}> = ({ setSelectedPatientId, setTabIndex }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const assessments: AssessmentResult[] = getAllAssessments();

  const filteredAssessments = searchQuery
    ? assessments.filter((assessment) =>
        assessment.patientId.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : assessments;

  return (
    <Container maxWidth="sm" style={{ paddingTop: "10%", overflow: "auto" }}>
      <Typography variant="h4" align="center" gutterBottom>
        Past Assessments
      </Typography>
      <TextField
        fullWidth
        label="Search by Patient ID"
        variant="outlined"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{ marginBottom: 20 }}
      />
      <List>
        {filteredAssessments.length > 0 ? (
          filteredAssessments.map((assessment) => (
            <ListItem
              key={assessment.patientId}
              disablePadding
              style={{ borderBottom: "1px solid #ccc" }}
            >
              <ListItemButton
                onClick={() => {
                  setSelectedPatientId(assessment.patientId);
                  // Delay for demonstration, e.g., waiting for UI transition
                  setTimeout(() => setTabIndex(1), 500);
                }}
              >
                <ListItemText
                  primary={`Patient ID: ${assessment.patientId}`}
                  secondary={`Completed at: ${new Date(
                    assessment.completedAt
                  ).toLocaleString()}`}
                />
              </ListItemButton>
            </ListItem>
          ))
        ) : (
          <Typography align="center">No past assessments found.</Typography>
        )}
      </List>
    </Container>
  );
};

export default PastAssessments;
