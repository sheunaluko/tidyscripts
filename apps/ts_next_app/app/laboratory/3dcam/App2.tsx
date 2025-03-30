"use client" ; 

import React, { useState } from "react";
import { Typography , Container, Box, Tabs, Tab, TextField, Button, Paper } from "@mui/material";
import DD from "./DeliriumDiagram" 
import { AssessmentProvider, useAssessment } from "./AssessmentContext";
import { useTheme } from '@mui/material/styles';


/*
   TODO
    - implement saving and retrieving by ID
    - optimize responsive layout
 */

const Display = () => {

    const theme = useTheme() ; 
    const { deliriumPresent, complete } = useAssessment() ;

    console.log(theme.breakpoints) 

    return ( 
    	<Box
	    sx={(theme) => ({
		width : "100%",
		height : "100%" ,
		display : "flex",
		flexDirection : "column", 
		maxWidth: "800px",
		maxHeight: "1400px",
		border: "1px solid black",
		[theme.breakpoints.down('md')]: {
		    border: "none",
		},
	    })}		

	>
	    { (deliriumPresent || complete)  ?   <SummaryScreen/> : <AssessmentScreen/>    }
	    
	</Box>
    )

}

const AssessmentScreen = () => {

    const { showDiagram } = useAssessment() ;
    
    return (
	<> 
    	<Banner /> 

	<Box flexGrow={1} >
	    <ShowItem />

	</Box>


	{ showDiagram ? 
	  <DiagramSection /> : <Box sx={{minHeight : "20%"}}>
	      <hr style={{border: 'none', height: '1px',  backgroundColor : 'black'}}/> 
	  </Box>
	}
	</>
    )

}



const App: React.FC = () => {

    return (
	<AssessmentProvider>
	    <Display/>
	</AssessmentProvider> 
    );
};

export default App;


const ShowItem = (props : any) => {

    const { currentItem , answer  } = useAssessment() ;

    let text = currentItem.text ; 
    let pass_choice = currentItem.answer_map.pass ; 
    let fail_choice = currentItem.answer_map.fail ; 
    

      return  (
      	  <Box display='flex' flexDirection='column' alignItems='center' justifyContent='space-around' width='100%'  height="100%" >
	      <Box display='flex' mt='5px' textAlign='center' padding="3%">
		  <Typography> {text} </Typography> 
	      </Box>

	      <Box display='flex' flexDirection='row' justifyContent='space-around' alignItems='center' width='100%'>
		  <Box>

		          <Button
			      variant="outlined"
			      sx={{
				  borderRadius: 0,
				  borderColor: 'black',
				  color: 'black',
				  backgroundColor: "#8cc97c",
				  
			      }}
			      onClick={()=>answer("pass")}
			  >
			      {pass_choice}
			  </Button>

		  </Box>

		  { fail_choice ? (
			<Box>
			    <Button
				variant="outlined"
				sx={{
				    borderRadius: 0,
				    borderColor: 'black',
				    color: 'black',
				    backgroundColor: "red",
				    
				}}
				onClick={()=>answer("fail")}
			    >
				{fail_choice}
			    </Button>

			</Box>
		  ) : null 
		  }
	      </Box>
	      
	  </Box>
      )
}     

const DiagramSection = () => {

    return (
	<React.Fragment>
	<hr style={{border: 'none', height: '1px',  backgroundColor : 'black'}}/>
	    <DD />
	<hr style={{border: 'none', height: '1px',  backgroundColor : 'black'}}/>	
	</React.Fragment> 
    )
    
} 


const Banner = () => {

    const { currentItem , answer, patientId , setPatientId } = useAssessment() ;
    let {banner_info} = currentItem ;
    let header  = banner_info.title ;
    let info    = banner_info.subtitle;
    let color   = banner_info.bgc ;
    let selectedPatientId = patientId ; 
    let setSelectedPatientId = setPatientId ; 


    const [localId, setLocalId] = useState(selectedPatientId) ; 
    
    return (
	<React.Fragment>

	<br />
	
	<Box sx={{ display : 'flex' , flexDirection : 'column' , backgroundColor: color, p: 2, color: (color == "#000000" ? 'white' : 'black' ) , alignItems : 'center' }}>
	    <Typography variant="h6">{header}</Typography>
	    <br/>
	    <Typography variant="body1">{info}</Typography>

	</Box>

	<br/> 
	
	<Box sx={{ display : 'flex' , flexDirection : 'column'  , alignItems : 'center' }}>

	    <Box sx={{ display : 'flex' , alignItems: 'center' , justifyContent : 'center' , width  : "25%" }}>


		<TextField
		    
		    value={localId}
		    onChange={(e) => {setLocalId(e.target.value) ; setSelectedPatientId(e.target.value)}}

	variant="outlined"
	sx={{
	    '& .MuiOutlinedInput-root': {
		borderRadius: 0, // No rounded corners
		'& fieldset': {
		    borderColor: 'black', // Dark black border
		},
		'&:hover fieldset': {
		    borderColor: 'black',
		},
		'&.Mui-focused fieldset': {
		    borderColor: 'black',
		}
	    }
	}
	    }

		    
		/>
	    </Box>
	</Box>

	<br/>

	<hr style={{border: 'none', height: '1px',  backgroundColor : 'black'}}/> 
	
	</React.Fragment>	
	

    ); 
    
}


const featureLabels: Record<string, string> = {
  "1": "Acute Change or Fluctuation",
  "2": "Inattention",
  "3": "Disorganized Thinking",
  "4": "Altered Level of Consciousness",
  "Override": "Severe AMS",
};

const SummaryScreen: React.FC = () => {
  const { features, responses, deliriumPresent, patientId, resetAssessment } = useAssessment();

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        3D-CAM Assessment Summary
      </Typography>

      <Typography variant="h6" sx={{ mt: 2 }}>
        Delirium Present:{" "}
        <strong style={{ color: deliriumPresent ? "red" : "green" }}>
          {deliriumPresent ? "Yes" : "No"}
        </strong>
      </Typography>

      <Typography variant="h6" sx={{ mt: 2 }}>
        ID:{" "}
        <strong >
	    {patientId}
        </strong>
      </Typography>
      

      {Object.entries(features).map(([featureId, isPositive]) => (
        <Box key={featureId} mt={3}>
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Feature {featureId}: {featureLabels[featureId] || "Unknown Feature"}
            </Typography>
            <Typography>
              <strong>Status:</strong>{" "}
              {isPositive ? "Positive (failed at least one item)" : "Negative"}
            </Typography>

            {responses[featureId] ? (
              <Box mt={1}>
                {Object.entries(responses[featureId]).map(([itemId, result]) => (
                  <Typography key={itemId} sx={{ ml: 2 , color : (result == 'fail' ? 'red' : 'black')}} >
                    {itemId as any}: {result as any}
                  </Typography>
                ))}
              </Box>
            ) : (
              <Typography sx={{ ml: 2 }}>No responses recorded.</Typography>
            )}
          </Paper>
        </Box>
      ))}

      <Box display="flex" flexDirection="row"  justifyContent="center"  mt='10px' >
      <Button variant="outlined" 
	  onClick={resetAssessment}
      >
	  Restart
      </Button>
      </Box> 
    </Box>
  );
};
