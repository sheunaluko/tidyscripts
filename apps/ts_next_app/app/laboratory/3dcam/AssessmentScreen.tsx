import React, { useState, useEffect } from "react";
import { useAssessmentLogic } from "./useAssessmentLogic";
import { saveAssessment } from "./useLocalStorage";
import { Card, CardContent, Typography, Button, Container, TextField } from "@mui/material";

const AssessmentScreen: React.FC<{ setSelectedPatientId: (id: string) => void , setTabIndex : (i : number)=> void }> = ({ setSelectedPatientId, setTabIndex }) => {
    
    const { currentItem, answerItem, calculateDeliriumScore, resetAssessment, isAssessmentComplete } = useAssessmentLogic();
    const [patientId, setPatientId] = useState("");
    const [isSubmitted, setIsSubmitted] = useState(false);

    useEffect(() => {
	resetAssessment(); // Reset assessment when entering the screen
	console.log("reset assessment logic") 
    }, []);

    
    const handleSubmit = () => {
	if (patientId.trim() !== "") {
	    setSelectedPatientId(patientId);
	    const finalResult = calculateDeliriumScore(patientId);
	    console.log(finalResult) 
	    saveAssessment(finalResult);
	    setIsSubmitted(true);
	    setTimeout( ()=> setTabIndex(1) , 500) ; 
	}
    };

    if (isSubmitted) {
	return (
	    <Container
	        style={{ paddingTop: "10%" , display: "flex", flexDirection: "column", justifyContent: "center" }}
	    >

		<Typography align="center">
		    The assessment is complete. Please switch to the Summary tab to view results.
		</Typography>
	    </Container>
	);
    }

    if (!currentItem) {
	return (
	    <Container 
		maxWidth="sm" 
		style={{ paddingTop: "10%" , display: "flex", flexDirection: "column", justifyContent: "center" }}
	    >

		<Typography variant="h5" gutterBottom>
		    Assessment Complete
		</Typography>
		

		<TextField
		    fullWidth
		    label="Patient ID"
		    variant="outlined"
		    value={patientId}
		    onChange={(e) => setPatientId(e.target.value)}
		    style={{ marginBottom: 20 }}
		/>
		

		{/* Complete Assessment Button */}
		<Button
		    variant="contained"
		    color="success"
		    fullWidth
		    style={{ marginTop: 20 }}
		    onClick={handleSubmit}
		    disabled={patientId.trim() === ""}
		>
		    Complete Assessment
		</Button>


	    </Container>
	);
    }

    return (
	<Container 
	    maxWidth="sm" 
	    style={{ paddingTop: "10%" , display: "flex", flexDirection: "column", justifyContent: "center" }}
	>
	    <TextField
		fullWidth
		label="Patient ID"
		variant="outlined"
		value={patientId}
		onChange={(e) => setPatientId(e.target.value)}
		style={{ marginBottom: 20 }}
	    />
	    <Card elevation={6} style={{ padding: 20, textAlign: "center", border: "2px solid #2196f3", position: "relative" }}>
		<CardContent>
		    {/* Feature and Item Number at Top Right */}
		    <Typography style={{ position: "absolute", top: 10, right: 15, color: "gray" }}>
			Feature {currentItem.feature.replace("feature", "")} - {currentItem.type === "question" ? "Assessment" : "Observation"} { currentItem.id[currentItem.id.length-1] } 
		    </Typography>
		    
		    {/* Question/Observation Text */}
		    <Typography variant="h5" gutterBottom>{currentItem.text}</Typography>

		    {/* Pass/Fail Buttons */}
		    <Button
			variant="contained"
			color="primary"
			fullWidth
			style={{ marginTop: 10 }}
			onClick={() => answerItem(currentItem.id, false)} // PASS = Negative Feature
		    >
			Pass
		    </Button>


		    <Button
			variant="contained"
			color="secondary"
			fullWidth
			style={{ marginTop: 10 }}
			onClick={() => answerItem(currentItem.id, true)} // FAIL = Positive Feature
		    >
			Fail
		    </Button>


		    
		</CardContent>
	    </Card>

	</Container>
    );
};

export default AssessmentScreen;
