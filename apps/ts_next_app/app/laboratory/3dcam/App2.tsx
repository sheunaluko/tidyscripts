"use client" ; 

import React, { useState } from "react";
import { Typography , Container, Box, Tabs, Tab, TextField, Button } from "@mui/material";
import AssessmentScreen from "./AssessmentScreen";
import SummaryScreen from "./SummaryScreen";
import PastAssessments from "./PastAssessments";
import DD from "./DeliriumDiagram" 

/*
   Todo: question flow logic + orchestration of UI components
   Some AI generated files in ./new_*

   Idea, start by enumerating ALL of the state variables:
   	 - bannerInfo
	 - DiagramPresent (boolean)
	 - DisplayingQuestion || DisplayingInfo , etc... 

*/



const App: React.FC = () => {


    let initDiagramColors = {
	'f1' : 'white' ,
	'f2' : 'white' ,
	'f3' : 'white' ,
	'f4' : 'white' ,	
    }
    
    const [tabIndex, setTabIndex] = useState(0);
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>("RM O8");
    const [showDiagram, setShowDiagram] = useState(false) 

    let initBannerInfo = {
	header : '3D-CAM',
	info : 'Step 1. Severe lethargy or severe altered level of consciousness screen' ,
	color : 'black' ,
	selectedPatientId,
	setSelectedPatientId, 
    }


    let initItem = {
	display_text : "Welcome to the 3D-CAM Assessment" 
    }
    
    const [bannerInfo, setBannerInfo] = useState(initBannerInfo);
    const [diagramColors, setDiagramColors] = useState(initDiagramColors);
    const [currentItem   , setCurrentItem ] = useState(initItem) ; 


    React.useEffect( ()=> {

	
    }, [currentItem])
    

    return (
	<Box
	    style={{
		height: "100%" ,
		width : "100%" , 
	        display: "flex",
		flexDirection: "column",
	    }}
	>

	    <Banner {...bannerInfo} />


	    <Box flexGrow={1} >
		<ShowItem
		    info={{
			text : "hey there" ,
			answer_question : true,
			pass_choice : "Correct" ,
			fail_choice : "Incorrect"  
		    }}
		    />

	    </Box>


	    { showDiagram ? 
	      <DiagramSection colors={diagramColors} /> : <Box sx={{minHeight : "20%"}}>
		  <hr style={{border: 'none', height: '1px',  backgroundColor : 'black'}}/> 
	      </Box>
	    }
	    
	</Box>
    );
};

export default App;

const RectangularButton: React.FC<RectangularButtonProps> = ({ children, ...props }) => {
  return (
    <Button
      variant="outlined"
      sx={{
        borderRadius: 0,
        borderColor: 'black',
        color: 'black',
        backgroundColor: props.bgc,
        
      }}
      {...props}
    >
      {children}
    </Button>
  );
};



const ShowItem = (props : any) => {
    let {text, answer_question, pass_choice, fail_choice} = props.info; 

      return  (
      	  <Box display='flex' flexDirection='column' alignItems='center' justifyContent='space-around' width='100%'  height="100%" >
	      <Box mt='5px'>
		  {text}
	      </Box>

	      <Box display='flex' flexDirection='row' justifyContent='space-around' alignItems='center' width='100%'>
		  <Box>
		      <RectangularButton bgc="#8cc97c">
			  {pass_choice}
		      </RectangularButton>
		  </Box>

		  { fail_choice ? (
		  <Box>
		      <RectangularButton bgc="red">
			  {fail_choice}			  
		      </RectangularButton>
		  </Box>
			) : null 
		  }
	      </Box>
	      
	  </Box>
      )
}     

const DiagramSection = ({colors} : any) => {

    return (
	<React.Fragment>
	<hr style={{border: 'none', height: '1px',  backgroundColor : 'black'}}/>
	    <DD colors={colors} />
	<hr style={{border: 'none', height: '1px',  backgroundColor : 'black'}}/>	
	</React.Fragment> 
    )
    
} 


const Banner = ({header, info , color, selectedPatientId, setSelectedPatientId} : any) => {


    const [localId, setLocalId] = useState(selectedPatientId) ; 
    
    return (
	<React.Fragment>

	<br />
	
	<Box sx={{ display : 'flex' , flexDirection : 'column' , backgroundColor: color, p: 2, color: 'white' , alignItems : 'center' }}>
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


/*
   {tabIndex === 0 && <AssessmentScreen setSelectedPatientId={setSelectedPatientId} setTabIndex={setTabIndex} />}
   {tabIndex === 1 && <SummaryScreen selectedPatientId={selectedPatientId} />}
   {tabIndex === 2 && <PastAssessments setSelectedPatientId={setSelectedPatientId} setTabIndex={setTabIndex} />}

 */
